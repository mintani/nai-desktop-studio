import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, extname, join } from "node:path";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { onInvalid } from "./http";
import { getOutputDir } from "./settings";
import { deleteThumbnail, ensureThumbnail } from "./thumbnails";

// The id is used in filesystem paths, so restrict the character set to
// prevent directory traversal.
const ID_PATTERN = /^[A-Za-z0-9_-]+$/;

/** Metadata for a single saved image. Matches StoredImage in docs/api.md. */
export type StoredImage = {
  id: string;
  createdAt: string;
  batchId: string;
  index: number;
  path: string;
  prompt: string;
  negativePrompt: string;
  model: string;
  width: number;
  height: number;
  steps: number;
  scale: number;
  sampler: string;
  seed: number;
  filePath: string;
};

/**
 * What the API hands back. `filePath` stays here: it is an absolute path on
 * this machine, the web never reads it, and sending it on every record of a
 * long history is bytes for nothing.
 */
export type ImageResponse = Omit<StoredImage, "filePath"> & {
  /** Server-relative path to the small version. */
  thumbPath: string;
};

export function toImageResponse(image: StoredImage): ImageResponse {
  return {
    id: image.id,
    createdAt: image.createdAt,
    batchId: image.batchId,
    index: image.index,
    path: image.path,
    thumbPath: `/images/${image.id}/thumb`,
    prompt: image.prompt,
    negativePrompt: image.negativePrompt,
    model: image.model,
    width: image.width,
    height: image.height,
    steps: image.steps,
    scale: image.scale,
    sampler: image.sampler,
    seed: image.seed,
  };
}

export type SaveImageParams = {
  batchId: string;
  index: number;
  bytes: Uint8Array;
  format: "png" | "webp";
  meta: {
    model: string;
    prompt: string;
    negativePrompt: string;
    width: number;
    height: number;
    steps: number;
    scale: number;
    sampler: string;
    seed: number;
  };
};

// In-memory index built by scanning disk on first access; updated on writes
// and deletes.
const index = new Map<string, StoredImage>();
let scannedDir: string | null = null;
// Newest first. Held so a list request does not copy and re-sort the whole
// library every time; dropped whenever the index changes.
let ordered: StoredImage[] | null = null;

/** How many sidecars to read at once while scanning. */
const SCAN_BATCH = 64;

async function readSidecar(
  dirPath: string,
  file: string
): Promise<StoredImage | null> {
  try {
    const raw = await readFile(join(dirPath, file), "utf-8");
    const stored = JSON.parse(raw) as StoredImage;
    if (!stored.id || !ID_PATTERN.test(stored.id)) return null;
    // Rebuild the real file location from where we scanned, so it still
    // resolves even if the output dir moved.
    const ext = extname(stored.filePath) || ".png";
    return {
      ...stored,
      filePath: join(dirPath, `${stored.id}${ext}`),
      path: `/images/${stored.id}/file`,
    };
  } catch {
    return null; // Ignore corrupt JSON.
  }
}

/**
 * Reads every sidecar under the output directory.
 *
 * The reads go out in batches rather than one after another: a library of a few
 * thousand images is a few thousand tiny files, and awaiting them in sequence
 * turns startup into one round trip per image. The batch is bounded so the
 * process never has thousands of open descriptors either.
 */
async function scan(outputDir: string): Promise<void> {
  let dateDirs;
  try {
    dateDirs = await readdir(outputDir, { withFileTypes: true });
  } catch {
    return; // Empty if the output directory does not exist yet.
  }

  for (const dateDir of dateDirs) {
    if (!dateDir.isDirectory()) continue;
    const dirPath = join(outputDir, dateDir.name);

    let files: string[];
    try {
      files = (await readdir(dirPath)).filter((file) => file.endsWith(".json"));
    } catch {
      continue;
    }

    for (let start = 0; start < files.length; start += SCAN_BATCH) {
      const slice = files.slice(start, start + SCAN_BATCH);
      const batch = await Promise.all(
        slice.map((file) => readSidecar(dirPath, file))
      );
      for (const stored of batch) {
        if (stored) index.set(stored.id, stored);
      }
    }
  }
}

async function ensureIndex(): Promise<void> {
  const outputDir = await getOutputDir();
  if (scannedDir === outputDir) return;
  index.clear();
  ordered = null;
  await scan(outputDir);
  scannedDir = outputDir;
}

function orderedImages(): StoredImage[] {
  ordered ??= [...index.values()].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt)
  );
  return ordered;
}

export async function saveImage(params: SaveImageParams): Promise<StoredImage> {
  await ensureIndex();
  const outputDir = await getOutputDir();

  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const dateFolder = createdAt.slice(0, 10); // YYYY-MM-DD
  const ext = params.format === "webp" ? "webp" : "png";

  const dir = join(outputDir, dateFolder);
  await mkdir(dir, { recursive: true });

  const filePath = join(dir, `${id}.${ext}`);
  await writeFile(filePath, params.bytes);

  const stored: StoredImage = {
    id,
    createdAt,
    batchId: params.batchId,
    index: params.index,
    path: `/images/${id}/file`,
    prompt: params.meta.prompt,
    negativePrompt: params.meta.negativePrompt,
    model: params.meta.model,
    width: params.meta.width,
    height: params.meta.height,
    steps: params.meta.steps,
    scale: params.meta.scale,
    sampler: params.meta.sampler,
    seed: params.meta.seed,
    filePath,
  };
  await writeFile(join(dir, `${id}.json`), JSON.stringify(stored, null, 2));

  index.set(id, stored);
  ordered = null;

  // Made now so the history has it the moment the image appears there, and not
  // awaited: the image is already safe on disk, and a slow or failed thumbnail
  // must not hold up the generation response.
  void ensureThumbnail(id, filePath);

  return stored;
}

/** List newest first. With limit, return at most that many from the front. */
export async function listImages(options?: {
  limit?: number;
}): Promise<ImageResponse[]> {
  await ensureIndex();
  const all = orderedImages();
  const page = options?.limit != null ? all.slice(0, options.limit) : all;
  return page.map(toImageResponse);
}

export async function getImage(id: string): Promise<StoredImage | null> {
  if (!ID_PATTERN.test(id)) return null;
  await ensureIndex();
  return index.get(id) ?? null;
}

export async function deleteImage(id: string): Promise<boolean> {
  if (!ID_PATTERN.test(id)) return false;
  await ensureIndex();
  const stored = index.get(id);
  if (!stored) return false;

  await rm(stored.filePath, { force: true });
  await rm(join(dirname(stored.filePath), `${id}.json`), { force: true });
  await deleteThumbnail(id);
  index.delete(id);
  ordered = null;
  return true;
}

export async function clearImages(): Promise<number> {
  await ensureIndex();
  const entries = [...index.values()];
  await Promise.all(
    entries.map(async (stored) => {
      await rm(stored.filePath, { force: true });
      await rm(join(dirname(stored.filePath), `${stored.id}.json`), {
        force: true,
      });
      await deleteThumbnail(stored.id);
    })
  );
  index.clear();
  ordered = null;
  return entries.length;
}

const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).optional(),
});

// A saved image never changes: the id is minted per file and nothing rewrites
// it. So the browser may keep both the file and its thumbnail indefinitely.
const IMMUTABLE = "public, max-age=31536000, immutable";

export const imagesRouter = new Hono()
  .get("/", zValidator("query", listQuerySchema, onInvalid), async (c) => {
    const images = await listImages({ limit: c.req.valid("query").limit });
    return c.json({ images });
  })
  .get("/:id/file", async (c) => {
    const image = await getImage(c.req.param("id"));
    if (!image) return c.json({ error: "Image not found" }, 404);
    const file = Bun.file(image.filePath);
    if (!(await file.exists())) {
      return c.json({ error: "Image file not found" }, 404);
    }
    return new Response(file, {
      headers: {
        "Content-Disposition": `inline; filename="${image.id}${extname(image.filePath)}"`,
        "Cache-Control": IMMUTABLE,
      },
    });
  })
  .get("/:id/thumb", async (c) => {
    const image = await getImage(c.req.param("id"));
    if (!image) return c.json({ error: "Image not found" }, 404);
    const thumb = await ensureThumbnail(image.id, image.filePath);
    if (!thumb) {
      // Unreadable source, or sharp is unavailable in this build. Serving the
      // full image is slower but still shows the picture.
      const file = Bun.file(image.filePath);
      if (!(await file.exists())) {
        return c.json({ error: "Image file not found" }, 404);
      }
      return new Response(file, { headers: { "Cache-Control": IMMUTABLE } });
    }
    return new Response(Bun.file(thumb), {
      headers: { "Content-Type": "image/webp", "Cache-Control": IMMUTABLE },
    });
  })
  .delete("/:id", async (c) => {
    const deleted = await deleteImage(c.req.param("id"));
    if (!deleted) return c.json({ error: "Image not found" }, 404);
    return c.json({ ok: true });
  })
  .delete("/", async (c) => {
    const deleted = await clearImages();
    return c.json({ ok: true, deleted });
  });
