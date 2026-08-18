import { mkdir, rename, rm, writeFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { onInvalid } from "./http";
import { configDir } from "./paths";

// The id is used in filesystem paths, so restrict the character set to
// prevent directory traversal (same guard as library.ts).
const ID_PATTERN = /^[A-Za-z0-9_-]+$/;

// Decoded image cap. Anything larger is rejected with 413.
const MAX_BYTES = 10 * 1024 * 1024;

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

function assetsDir(): string {
  return join(configDir(), "assets");
}

/** Locate the stored file for an id by probing the known extensions. */
async function findAssetPath(id: string): Promise<string | null> {
  if (!ID_PATTERN.test(id)) return null;
  for (const ext of Object.keys(TYPE_BY_EXT)) {
    const candidate = join(assetsDir(), `${id}.${ext}`);
    if (await Bun.file(candidate).exists()) return candidate;
  }
  return null;
}

const postBodySchema = z.object({
  imageBase64: z.string().min(1),
  contentType: z.string().min(1),
});

export const assetsRouter = new Hono()
  .post("/", zValidator("json", postBodySchema, onInvalid), async (c) => {
    const body = c.req.valid("json");
    const ext = EXT_BY_TYPE[body.contentType];
    if (!ext) return c.json({ error: "Unsupported content type" }, 415);

    const bytes = Buffer.from(body.imageBase64, "base64");
    if (bytes.length === 0) return c.json({ error: "Empty image data" }, 400);
    if (bytes.length > MAX_BYTES) {
      return c.json({ error: "Image exceeds the 10 MB limit" }, 413);
    }

    const id = crypto.randomUUID();
    const dir = assetsDir();
    await mkdir(dir, { recursive: true });
    const file = join(dir, `${id}.${ext}`);
    const tmp = join(dir, `.${id}.${crypto.randomUUID()}.tmp`);
    await writeFile(tmp, bytes);
    await rename(tmp, file).catch(async (error) => {
      await rm(tmp, { force: true });
      throw error;
    });

    return c.json({ id, path: `/assets/${id}/file` });
  })
  .get("/:id/file", async (c) => {
    const path = await findAssetPath(c.req.param("id"));
    if (!path) return c.json({ error: "Asset not found" }, 404);
    const type = TYPE_BY_EXT[extname(path).slice(1)];
    return new Response(
      Bun.file(path),
      type ? { headers: { "Content-Type": type } } : undefined
    );
  })
  .delete("/:id", async (c) => {
    const path = await findAssetPath(c.req.param("id"));
    if (!path) return c.json({ error: "Asset not found" }, 404);
    await rm(path, { force: true });
    return c.json({ ok: true });
  });
