import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { env } from "@nai-desktop-studio/env/server";
import {
  createNovelAIClient,
  encodeSseMessage,
  encodeVibeSchema,
  estimateAnlas,
  estimateAnlasSchema,
  generateImageSchema,
  generateImageStreamSchema,
} from "@nai-desktop-studio/novelai";
import type { GenerationMeta, StreamFrame } from "@nai-desktop-studio/novelai";
import { onInvalid } from "./http";
import { getApiKey } from "./settings";
import { saveImage, toImageResponse } from "./library";

const NO_KEY_MESSAGE = "NovelAI API key is not configured";

// Generation bodies extend generateImageSchema with batch_id / index used
// for save metadata. Strip these before building the payload and pass them
// only to the library save.
const generateBodySchema = generateImageSchema.extend({
  batch_id: z.string().min(1).optional(),
  index: z.number().int().min(0).optional(),
});

const generateStreamBodySchema = generateImageStreamSchema.extend({
  batch_id: z.string().min(1).optional(),
  index: z.number().int().min(0).optional(),
});

/** Create a NovelAI client if a valid key exists, otherwise null. */
async function getClient() {
  const apiKey = await getApiKey();
  if (!apiKey) return null;
  return createNovelAIClient({
    apiKey,
    imageBase: env.NOVELAI_IMAGE_BASE,
    apiBase: env.NOVELAI_API_BASE,
  });
}

function formatFromContentType(contentType: string): "png" | "webp" {
  return contentType.includes("webp") ? "webp" : "png";
}

/**
 * Pass through a Response thrown by NovelAI as-is; wrap anything else as a
 * JSON error.
 */
function errorResponse(error: unknown, fallbackStatus: number): Response {
  if (error instanceof Response) return error;
  return new Response(
    JSON.stringify({
      error: error instanceof Error ? error.message : "Unknown error",
    }),
    { status: fallbackStatus, headers: { "Content-Type": "application/json" } }
  );
}

async function persistFrame(
  base64: string,
  meta: GenerationMeta,
  batchId: string,
  index: number
) {
  const stored = await saveImage({
    batchId,
    index,
    bytes: Buffer.from(base64, "base64"),
    // Frames from the generation stream are always PNG.
    format: "png",
    meta,
  });
  return toImageResponse(stored);
}

/**
 * Reshape frames into preview / image / done SSE events while saving the final
 * frame exactly once. NovelAI chunks carry event_type: "intermediate" | "final"
 * (the official generate-image-stream spec). intermediate maps to preview;
 * final is the main path: library save plus image.
 */
function createStreamBody(
  frames: AsyncGenerator<StreamFrame>,
  meta: GenerationMeta,
  batchId: string,
  index: number
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: string, data: unknown) =>
        controller.enqueue(encoder.encode(encodeSseMessage(event, data)));

      try {
        let pendingFinal: string | undefined;
        let saved = false;

        for await (const frame of frames) {
          if (!frame.image) continue;

          if (frame.eventType === "final" && !saved) {
            const stored = await persistFrame(
              frame.image,
              meta,
              batchId,
              index
            );
            send("image", { type: "image", image: stored });
            saved = true;
            pendingFinal = undefined;
          } else if (frame.eventType !== "final") {
            send("preview", { type: "preview", image: frame.image });
            pendingFinal = frame.image;
          }
        }

        // Safety net: only when no chunk carried event_type=final, treat the
        // last image received before the stream closed as the final one. Skips
        // if one was already saved.
        if (!saved && pendingFinal) {
          const stored = await persistFrame(pendingFinal, meta, batchId, index);
          send("image", { type: "image", image: stored });
        }

        send("done", { type: "done" });
      } catch (error) {
        send("error", {
          type: "error",
          message:
            error instanceof Error ? error.message : "Unknown stream error",
        });
      } finally {
        controller.close();
      }
    },
  });
}

export const novelaiRouter = new Hono()
  .get("/subscription", async (c) => {
    const client = await getClient();
    if (!client) return c.json({ error: NO_KEY_MESSAGE }, 428);
    try {
      return c.json(await client.subscription());
    } catch (error) {
      return errorResponse(error, 502);
    }
  })
  .post(
    "/anlas-estimate",
    zValidator("json", estimateAnlasSchema, onInvalid),
    (c) => {
      try {
        return c.json(estimateAnlas(c.req.valid("json")));
      } catch (error) {
        return c.json(
          { error: error instanceof Error ? error.message : "Unknown error" },
          400
        );
      }
    }
  )
  .post(
    "/encode-vibe",
    zValidator("json", encodeVibeSchema, onInvalid),
    async (c) => {
      const client = await getClient();
      if (!client) return c.json({ error: NO_KEY_MESSAGE }, 428);
      try {
        const data = await client.encodeVibe(c.req.valid("json"));
        return c.json({ data });
      } catch (error) {
        return errorResponse(error, 500);
      }
    }
  )
  .post(
    "/generate",
    zValidator("json", generateBodySchema, onInvalid),
    async (c) => {
      const client = await getClient();
      if (!client) return c.json({ error: NO_KEY_MESSAGE }, 428);
      try {
        const { batch_id, index, ...rest } = c.req.valid("json");
        const batchId = batch_id ?? crypto.randomUUID();
        const startIndex = index ?? 0;
        // Pass n_samples through: a batch (n_samples > 1) returns all samples,
        // which we save under one batch with consecutive indices.
        const { images, meta } = await client.generate(rest);
        const saved = await Promise.all(
          images.map((img, i) =>
            saveImage({
              batchId,
              index: startIndex + i,
              bytes: img.image,
              format: formatFromContentType(img.contentType),
              // NovelAI increments the seed per sample: sample i is seed + i.
              meta: { ...meta, seed: meta.seed + i },
            })
          )
        );
        return c.json({ images: saved.map(toImageResponse) });
      } catch (error) {
        return errorResponse(error, 400);
      }
    }
  )
  .post(
    "/generate-stream",
    zValidator("json", generateStreamBodySchema, onInvalid),
    async (c) => {
      const client = await getClient();
      if (!client) return c.json({ error: NO_KEY_MESSAGE }, 428);
      try {
        const { batch_id, index, ...rest } = c.req.valid("json");
        const batchId = batch_id ?? crypto.randomUUID();
        const slot = index ?? 0;
        const { meta, frames } = await client.generateStream({
          ...rest,
          n_samples: 1,
        });
        return new Response(createStreamBody(frames, meta, batchId, slot), {
          headers: {
            "Content-Type": "text/event-stream; charset=utf-8",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
          },
        });
      } catch (error) {
        return errorResponse(error, 400);
      }
    }
  );
