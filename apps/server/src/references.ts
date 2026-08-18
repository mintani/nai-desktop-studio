import { mkdir, rename, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { env } from "@nai-desktop-studio/env/server";
import { createNovelAIClient } from "@nai-desktop-studio/novelai";
import type { EncodeVibeBody } from "@nai-desktop-studio/novelai";
import { readAssetBase64 } from "./assets";
import { patchCollectionRecord, readCollection } from "./collections";
import { onInvalid } from "./http";
import { configDir } from "./paths";
import { getApiKey } from "./settings";

/**
 * The model a vibe is encoded against.
 *
 * An encode is model-specific: one made for a different model cannot be used.
 * Pinning it is what lets the result be cached at all — otherwise switching the
 * generation model would silently invalidate every stored encode, and the whole
 * point of the library is that the 2 Anlas is paid once.
 */
const ENCODE_MODEL = "nai-diffusion-4-5-full";

const ID_PATTERN = /^[A-Za-z0-9_-]+$/;

function encodedDir(): string {
  return join(configDir(), "encoded-vibes");
}

function encodedPath(id: string): string {
  return join(encodedDir(), `${id}.txt`);
}

async function readEncoded(id: string): Promise<string | null> {
  const file = Bun.file(encodedPath(id));
  return (await file.exists()) ? file.text() : null;
}

async function writeEncoded(id: string, encoded: string): Promise<void> {
  await mkdir(encodedDir(), { recursive: true });
  const target = encodedPath(id);
  const tmp = `${target}.${crypto.randomUUID()}.tmp`;
  await writeFile(tmp, encoded);
  await rename(tmp, target).catch(async (error: unknown) => {
    await rm(tmp, { force: true });
    throw error;
  });
}

export async function deleteEncoded(id: string): Promise<void> {
  await rm(encodedPath(id), { force: true }).catch(() => undefined);
}

/** One library entry, as far as this endpoint needs to understand it. */
type ReferenceRecord = {
  id: string;
  kind?: unknown;
  imagePath?: unknown;
  strength?: unknown;
  infoExtracted?: unknown;
  referenceType?: unknown;
  fidelity?: unknown;
  encodedAt?: unknown;
};

function readNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export type ResolvedReference = {
  id: string;
  kind: "vibe" | "reference";
  /** Base64 of the source image. Empty for a vibe, which sends its encode. */
  image: string;
  /** The encode. Empty for a precise reference, which sends the image. */
  encoded: string;
  referenceType: string;
  strength: number;
  fidelity: number;
};

const resolveBodySchema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(32),
});

/**
 * Turns library ids into what a generation request needs.
 *
 * A vibe is encoded here, once, and the result is kept on disk. Every later
 * generation reads the file instead of spending 2 Anlas again — which is the
 * reason the library exists. A precise reference is sent as the image itself,
 * so it only has to be read back.
 */
async function resolveOne(
  record: ReferenceRecord,
  encodeVibe: (request: EncodeVibeBody) => Promise<string>
): Promise<ResolvedReference | null> {
  const kind = record.kind === "reference" ? "reference" : "vibe";
  const imagePath =
    typeof record.imagePath === "string" ? record.imagePath : "";
  const strength = readNumber(record.strength, kind === "vibe" ? 0.6 : 1);
  const fidelity = readNumber(record.fidelity, 1);
  const referenceType =
    typeof record.referenceType === "string"
      ? record.referenceType
      : "character&style";

  if (kind === "reference") {
    const image = await readAssetBase64(imagePath);
    if (!image) return null;
    return {
      id: record.id,
      kind,
      image,
      encoded: "",
      referenceType,
      strength,
      fidelity,
    };
  }

  const cached = await readEncoded(record.id);
  if (cached) {
    return {
      id: record.id,
      kind,
      image: "",
      encoded: cached,
      referenceType,
      strength,
      fidelity,
    };
  }

  const image = await readAssetBase64(imagePath);
  if (!image) return null;

  const encoded = await encodeVibe({
    image,
    information_extracted: readNumber(record.infoExtracted, 0.7),
    model: ENCODE_MODEL,
  });
  await writeEncoded(record.id, encoded);
  // The list shows which entries are already paid for, so record it where the
  // web can read it without asking for the blob itself.
  await patchCollectionRecord("references", record.id, {
    encodedAt: new Date().toISOString(),
  });

  return {
    id: record.id,
    kind,
    image: "",
    encoded,
    referenceType,
    strength,
    fidelity,
  };
}

export const referencesRouter = new Hono()
  .post(
    "/resolve",
    zValidator("json", resolveBodySchema, onInvalid),
    async (c) => {
      const apiKey = await getApiKey();
      if (!apiKey) {
        return c.json({ error: "NovelAI API key is not configured" }, 428);
      }
      const { encodeVibe } = createNovelAIClient({
        apiKey,
        imageBase: env.NOVELAI_IMAGE_BASE,
        apiBase: env.NOVELAI_API_BASE,
      });

      const records = (await readCollection("references")) as ReferenceRecord[];
      const byId = new Map(records.map((record) => [record.id, record]));

      // Sequential: each miss is a paid network call, and doing them at once
      // only makes a rate limit more likely.
      const items: ResolvedReference[] = [];
      for (const id of c.req.valid("json").ids) {
        const record = byId.get(id);
        if (!record) continue;
        try {
          const resolved = await resolveOne(record, encodeVibe);
          if (resolved) items.push(resolved);
        } catch (error) {
          // One bad entry must not lose the rest of the run. The caller reports
          // how many were dropped.
          console.error(`[references] could not resolve ${id}:`, error);
        }
      }
      return c.json({ items });
    }
  )
  .delete("/:id/encoded", async (c) => {
    const id = c.req.param("id");
    if (!ID_PATTERN.test(id)) return c.json({ error: "Invalid id" }, 400);
    await deleteEncoded(id);
    await patchCollectionRecord("references", id, { encodedAt: null });
    return c.json({ ok: true });
  });
