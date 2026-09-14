import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { onInvalid } from "./http";
import { dropSession, loadLabels, rankArtists } from "./inference";
import { getImage } from "./library";
import { artistPostCounts } from "./tags";
import {
  MODELS,
  deleteModel,
  findModel,
  isModelReady,
  modelForRole,
  modelStatus,
  startDownload,
  type ModelSpec,
} from "./models";

/**
 * One question about a picture: whose style does it look like. It runs
 * locally on a model fetched on demand (see models.ts), so nothing leaves the
 * machine.
 */

// Same cap as the assets endpoint: base64 decodes to at most this.
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

const imageRefSchema = z.union([
  z.object({ imageId: z.string().min(1) }),
  z.object({ imageBase64: z.string().min(1) }),
]);
type ImageRef = z.infer<typeof imageRefSchema>;

type Loaded = { id: string | null; bytes: Uint8Array; prompt: string | null };

/**
 * The bytes an image reference points at. A library id is read from the
 * output directory; a base64 body is decoded. Failures come back as an HTTP
 * status so the handler can answer in the usual `{ error }` shape.
 */
async function loadImage(
  ref: ImageRef
): Promise<
  | { ok: true; image: Loaded }
  | { ok: false; error: string; status: 400 | 404 | 413 }
> {
  if ("imageId" in ref) {
    const stored = await getImage(ref.imageId);
    if (!stored) return { ok: false, error: "Image not found", status: 404 };
    const file = Bun.file(stored.filePath);
    if (!(await file.exists())) {
      return { ok: false, error: "Image file not found", status: 404 };
    }
    return {
      ok: true,
      image: {
        id: stored.id,
        bytes: await file.bytes(),
        prompt: stored.prompt,
      },
    };
  }
  const bytes = Buffer.from(ref.imageBase64, "base64");
  if (bytes.length === 0) {
    return { ok: false, error: "Empty image data", status: 400 };
  }
  if (bytes.length > MAX_IMAGE_BYTES) {
    return { ok: false, error: "Image exceeds the 10 MB limit", status: 413 };
  }
  return { ok: true, image: { id: null, bytes, prompt: null } };
}

async function ensureReady(spec: ModelSpec): Promise<Response | null> {
  if (await isModelReady(spec)) return null;
  return new Response(
    JSON.stringify({
      error: `${spec.label} is not downloaded`,
      model: spec.id,
    }),
    { status: 409, headers: { "Content-Type": "application/json" } }
  );
}

function errorResponse(error: unknown): Response {
  const message = error instanceof Error ? error.message : "Analysis failed";
  // sharp says so when the bytes are not an image it can decode; that is the
  // caller's input, not a failure of the model.
  const status = /unsupported image format/i.test(message) ? 400 : 500;
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** Artist tags are matched the way the tag list writes them, prefix and case aside. */
function normalizeArtist(name: string): string {
  return name
    .trim()
    .replace(/^artist:/i, "")
    .replace(/\s+/g, "_")
    .toLowerCase();
}

/**
 * The tags a prompt is made of, in the tag list's spelling: split on commas,
 * emphasis and weights stripped (`{tag}`, `[tag]`, `1.2::tag::`), the
 * `artist:` prefix dropped. A Text: block is left out — it is rendered text,
 * not tags.
 */
function promptTags(prompt: string): string[] {
  const tagPart = prompt.split(/(?:^|\n)Text:/)[0] ?? "";
  return tagPart
    .split(/[,\n]/)
    .map((token) =>
      normalizeArtist(
        token
          .trim()
          .replace(/^-?\d+(?:\.\d+)?::(.*)::$/s, "$1")
          .replace(/^[{[]+|[}\]]+$/g, "")
      )
    )
    .filter((tag) => tag.length > 0);
}

const artistsBodySchema = z.object({
  image: imageRefSchema,
  /** A Danbooru artist tag to report on, whether or not it makes the top list. */
  artist: z.string().trim().min(1).max(200).optional(),
  /**
   * How many candidates to return. The client filters small artists out on
   * its side, so it asks for more than it shows.
   */
  limit: z.number().int().min(1).max(500).optional(),
});

export const analysisRouter = new Hono()
  .get("/models", async (c) =>
    c.json({ items: await Promise.all(MODELS.map(modelStatus)) })
  )
  .post("/models/:id/download", (c) => {
    const spec = findModel(c.req.param("id"));
    if (!spec) return c.json({ error: "Unknown model" }, 404);
    startDownload(spec);
    return c.json({ ok: true }, 202);
  })
  .delete("/models/:id", async (c) => {
    const spec = findModel(c.req.param("id"));
    if (!spec) return c.json({ error: "Unknown model" }, 404);
    await dropSession(spec.id);
    await deleteModel(spec);
    return c.json({ ok: true });
  })
  /**
   * The artists the classifier thinks this looks like. Scores are the
   * model's softmax over 39k artists: a number to rank candidates by, not a
   * probability that the picture copies anyone. Answered as a list of one so
   * a second model can be added without changing the shape.
   */
  .post(
    "/artists",
    zValidator("json", artistsBodySchema, onInvalid),
    async (c) => {
      const { image: ref, artist, limit } = c.req.valid("json");
      const spec = modelForRole("artist");
      const notReady = await ensureReady(spec);
      if (notReady) return notReady;

      const loaded = await loadImage(ref);
      if (!loaded.ok) return c.json({ error: loaded.error }, loaded.status);

      try {
        const [labels, ranking, posts] = await Promise.all([
          loadLabels(spec),
          rankArtists(spec, loaded.image.bytes),
          artistPostCounts(),
        ]);
        const candidates = ranking.slice(0, limit ?? 10).map((entry) => {
          const name = labels[entry.index] ?? `#${entry.index}`;
          return {
            name,
            score: entry.score,
            // Danbooru posts under the tag, or null for a name the tag list
            // does not carry.
            posts: posts.get(name.toLowerCase()) ?? null,
          };
        });

        // Where a tag sits in the full ranking, or null for one the model
        // does not know.
        const place = (wanted: string) => {
          const at = ranking.findIndex(
            (entry) => labels[entry.index]?.toLowerCase() === wanted
          );
          if (at < 0) return null;
          const name = labels[ranking[at]!.index]!;
          return {
            name,
            score: ranking[at]!.score,
            rank: at + 1,
            posts: posts.get(name.toLowerCase()) ?? null,
          };
        };

        const lookup = artist ? place(normalizeArtist(artist)) : null;

        // The artists the prompt asked for, so their pull can be read off
        // directly rather than hunted for in the candidate list.
        const mentioned = [];
        for (const tag of new Set(promptTags(loaded.image.prompt ?? ""))) {
          const placed = place(tag);
          if (placed) mentioned.push(placed);
        }

        return c.json({
          results: [
            {
              model: spec.id,
              label: spec.label,
              artists: labels.length,
              candidates,
              lookup,
              mentioned,
            },
          ],
        });
      } catch (error) {
        return errorResponse(error);
      }
    }
  );
