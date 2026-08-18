import { mkdir, readdir, rename, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { env } from "@nai-desktop-studio/env/server";
import { createNovelAIClient } from "@nai-desktop-studio/novelai";
import type { EncodeVibeBody } from "@nai-desktop-studio/novelai";
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

/**
 * One reference is one directory:
 *
 *     <configDir>/references/<id>/
 *     ├── reference.json
 *     ├── image.png
 *     └── encoded.txt      (a vibe, after its first paid encode)
 *
 * Everything about an entry is in one place, so creating it is one write and
 * deleting it is one removal. The three parts used to live in three trees —
 * a row in one big collections file, a file under assets/, a file under
 * encoded-vibes/ — which left the browser to keep them in step across three
 * requests, and left an interrupted delete as an image nobody references or an
 * encode nobody owns.
 */
function referencesDir(): string {
  return join(configDir(), "references");
}

// The id lands in a filesystem path, so restrict it rather than trust it.
const ID_PATTERN = /^[A-Za-z0-9_-]+$/;

function entryDir(id: string): string {
  return join(referencesDir(), id);
}

const EXT_BY_TYPE: Record<string, string> = {
  "image/png": "png",
  "image/webp": "webp",
  "image/jpeg": "jpg",
};

const TYPE_BY_EXT: Record<string, string> = {
  png: "image/png",
  webp: "image/webp",
  jpg: "image/jpeg",
};

/** Decoded image cap, matching the assets endpoint. */
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

/** What is written to `reference.json`. */
type StoredReference = {
  id: string;
  name: string;
  groupName: string | null;
  kind: "vibe" | "reference";
  strength: number;
  infoExtracted: number;
  referenceType: string;
  fidelity: number;
  /** When the encode was cached. Null means the next use costs 2 Anlas. */
  encodedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

function metaPath(id: string): string {
  return join(entryDir(id), "reference.json");
}

function encodedPath(id: string): string {
  return join(entryDir(id), "encoded.txt");
}

/** The stored image, found by probing the extensions that can be written. */
async function imagePath(id: string): Promise<string | null> {
  if (!ID_PATTERN.test(id)) return null;
  for (const ext of Object.keys(TYPE_BY_EXT)) {
    const candidate = join(entryDir(id), `image.${ext}`);
    if (await Bun.file(candidate).exists()) return candidate;
  }
  return null;
}

/** Write through a temporary file, so a crash cannot leave a torn one. */
async function writeAtomic(
  target: string,
  data: string | Uint8Array
): Promise<void> {
  const tmp = `${target}.${crypto.randomUUID()}.tmp`;
  await writeFile(tmp, data);
  await rename(tmp, target).catch(async (error: unknown) => {
    await rm(tmp, { force: true });
    throw error;
  });
}

function readNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

/**
 * Rebuild an entry from its file. A field that is missing or the wrong type
 * falls back rather than failing: a library that will not open because one
 * record was hand-edited is worse than one that opens with a default.
 */
function normalize(input: unknown, id: string): StoredReference {
  const record = (input ?? {}) as Record<string, unknown>;
  const kind = record.kind === "reference" ? "reference" : "vibe";
  const referenceType = readString(record.referenceType);
  const now = new Date().toISOString();

  return {
    id,
    name: readString(record.name) ?? id,
    groupName: readString(record.groupName),
    kind,
    strength: readNumber(record.strength, kind === "vibe" ? 0.6 : 1),
    infoExtracted: readNumber(record.infoExtracted, 0.7),
    referenceType:
      referenceType === "character" || referenceType === "style"
        ? referenceType
        : "character&style",
    fidelity: readNumber(record.fidelity, 1),
    encodedAt: readString(record.encodedAt),
    createdAt: readString(record.createdAt) ?? now,
    updatedAt: readString(record.updatedAt) ?? now,
  };
}

async function readEntry(id: string): Promise<StoredReference | null> {
  if (!ID_PATTERN.test(id)) return null;
  const file = Bun.file(metaPath(id));
  if (!(await file.exists())) return null;
  try {
    return normalize(await file.json(), id);
  } catch {
    return null;
  }
}

async function writeEntry(entry: StoredReference): Promise<void> {
  await mkdir(entryDir(entry.id), { recursive: true });
  await writeAtomic(metaPath(entry.id), `${JSON.stringify(entry, null, 2)}\n`);
}

async function listEntries(): Promise<StoredReference[]> {
  let names: string[];
  try {
    names = await readdir(referencesDir());
  } catch {
    // Nothing saved yet.
    return [];
  }
  const entries = await Promise.all(names.map((name) => readEntry(name)));
  return entries
    .filter((entry): entry is StoredReference => entry !== null)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

async function readEncoded(id: string): Promise<string | null> {
  const file = Bun.file(encodedPath(id));
  return (await file.exists()) ? file.text() : null;
}

export async function deleteEncoded(id: string): Promise<void> {
  if (!ID_PATTERN.test(id)) return;
  await rm(encodedPath(id), { force: true }).catch(() => undefined);
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

/**
 * Turns library ids into what a generation request needs.
 *
 * A vibe is encoded here, once, and the result is kept beside it. Every later
 * generation reads that file instead of spending 2 Anlas again — which is the
 * reason the library exists. A precise reference is sent as the image itself,
 * so it only has to be read back.
 */
async function resolveOne(
  entry: StoredReference,
  encodeVibe: (request: EncodeVibeBody) => Promise<string>
): Promise<ResolvedReference | null> {
  const source = await imagePath(entry.id);
  if (!source) return null;

  const common = {
    id: entry.id,
    kind: entry.kind,
    referenceType: entry.referenceType,
    strength: entry.strength,
    fidelity: entry.fidelity,
  };

  if (entry.kind === "reference") {
    const bytes = await Bun.file(source).arrayBuffer();
    return {
      ...common,
      image: Buffer.from(bytes).toString("base64"),
      encoded: "",
    };
  }

  const cached = await readEncoded(entry.id);
  if (cached) return { ...common, image: "", encoded: cached };

  const bytes = await Bun.file(source).arrayBuffer();
  const encoded = await encodeVibe({
    image: Buffer.from(bytes).toString("base64"),
    information_extracted: entry.infoExtracted,
    model: ENCODE_MODEL,
  });
  await writeAtomic(encodedPath(entry.id), encoded);
  await writeEntry({ ...entry, encodedAt: new Date().toISOString() });

  return { ...common, image: "", encoded };
}

const metadataSchema = z.object({
  name: z.string().min(1).max(200),
  groupName: z.string().max(200).nullable().optional(),
  kind: z.enum(["vibe", "reference"]),
  strength: z.number().min(0).max(1),
  infoExtracted: z.number().min(0).max(1),
  referenceType: z.enum(["character", "style", "character&style"]),
  fidelity: z.number().min(0).max(1),
});

const createBodySchema = metadataSchema.extend({
  imageBase64: z.string().min(1),
  contentType: z.string().min(1),
});

const resolveBodySchema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(32),
});

// An entry's image never changes: a different image is a different entry. So
// the browser may keep it for as long as it likes.
const IMMUTABLE = "public, max-age=31536000, immutable";

export const referencesRouter = new Hono()
  .get("/", async (c) => c.json({ items: await listEntries() }))
  .post("/", zValidator("json", createBodySchema, onInvalid), async (c) => {
    const { imageBase64, contentType, ...metadata } = c.req.valid("json");
    const ext = EXT_BY_TYPE[contentType];
    if (!ext) return c.json({ error: "Unsupported content type" }, 415);

    const bytes = Buffer.from(imageBase64, "base64");
    if (bytes.length === 0) return c.json({ error: "Empty image data" }, 400);
    if (bytes.length > MAX_IMAGE_BYTES) {
      return c.json({ error: "Image exceeds the 10 MB limit" }, 413);
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    // The image first: a directory holding metadata that points at nothing is
    // the state this whole layout exists to avoid.
    await mkdir(entryDir(id), { recursive: true });
    await writeAtomic(join(entryDir(id), `image.${ext}`), bytes);
    const entry: StoredReference = {
      ...metadata,
      id,
      groupName: metadata.groupName ?? null,
      encodedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    await writeEntry(entry);
    return c.json(entry, 201);
  })
  .put("/:id", zValidator("json", metadataSchema, onInvalid), async (c) => {
    const id = c.req.param("id");
    const current = await readEntry(id);
    if (!current) return c.json({ error: "Reference not found" }, 404);

    const patch = c.req.valid("json");
    const next: StoredReference = {
      ...current,
      ...patch,
      groupName: patch.groupName ?? null,
      updatedAt: new Date().toISOString(),
    };

    // The encode is of one image at one information-extracted value. Change
    // either and what is on disk no longer describes this entry, so it goes —
    // here rather than in the browser, because the file is the server's.
    if (
      next.kind !== current.kind ||
      next.infoExtracted !== current.infoExtracted
    ) {
      await deleteEncoded(id);
      next.encodedAt = null;
    }

    await writeEntry(next);
    return c.json(next);
  })
  .delete("/:id", async (c) => {
    const id = c.req.param("id");
    if (!ID_PATTERN.test(id)) return c.json({ error: "Invalid id" }, 400);
    if (!(await readEntry(id))) {
      return c.json({ error: "Reference not found" }, 404);
    }
    // One removal takes the image, the metadata and the encode together.
    await rm(entryDir(id), { recursive: true, force: true });
    return c.json({ ok: true });
  })
  .get("/:id/image", async (c) => {
    const path = await imagePath(c.req.param("id"));
    if (!path) return c.json({ error: "Reference image not found" }, 404);
    const ext = path.slice(path.lastIndexOf(".") + 1);
    const type = TYPE_BY_EXT[ext];
    return new Response(Bun.file(path), {
      headers: {
        ...(type ? { "Content-Type": type } : {}),
        "Cache-Control": IMMUTABLE,
      },
    });
  })
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

      // Sequential: each miss is a paid network call, and doing them at once
      // only makes a rate limit more likely.
      const items: ResolvedReference[] = [];
      for (const id of c.req.valid("json").ids) {
        const entry = await readEntry(id);
        if (!entry) continue;
        try {
          const resolved = await resolveOne(entry, encodeVibe);
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
    const entry = await readEntry(id);
    if (!entry) return c.json({ error: "Reference not found" }, 404);
    await deleteEncoded(id);
    await writeEntry({ ...entry, encodedAt: null });
    return c.json({ ok: true });
  });
