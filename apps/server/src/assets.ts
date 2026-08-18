import { mkdir, rename, rm, writeFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { Elysia } from "elysia";
import { z } from "zod";
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

/** The bytes behind an `/assets/<id>/file` path, for server-side use. */
export async function readAssetBase64(path: string): Promise<string | null> {
  const id = /\/assets\/([^/]+)/.exec(path)?.[1];
  if (!id) return null;
  const file = await findAssetPath(id);
  if (!file) return null;
  return Buffer.from(await Bun.file(file).arrayBuffer()).toString("base64");
}

const postBodySchema = z.object({
  imageBase64: z.string().min(1),
  contentType: z.string().min(1),
});

export const assetsRouter = new Elysia({ prefix: "/assets" })
  .post(
    "/",
    async ({ body, set }) => {
      const ext = EXT_BY_TYPE[body.contentType];
      if (!ext) {
        set.status = 415;
        return { error: "Unsupported content type" };
      }

      const bytes = Buffer.from(body.imageBase64, "base64");
      if (bytes.length === 0) {
        set.status = 400;
        return { error: "Empty image data" };
      }
      if (bytes.length > MAX_BYTES) {
        set.status = 413;
        return { error: "Image exceeds the 10 MB limit" };
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

      return { id, path: `/assets/${id}/file` };
    },
    { body: postBodySchema }
  )
  .get("/:id/file", async ({ params, set }) => {
    const path = await findAssetPath(params.id);
    if (!path) {
      set.status = 404;
      return { error: "Asset not found" };
    }
    const type = TYPE_BY_EXT[extname(path).slice(1)];
    if (type) set.headers["Content-Type"] = type;
    return Bun.file(path);
  })
  .delete("/:id", async ({ params, set }) => {
    const path = await findAssetPath(params.id);
    if (!path) {
      set.status = 404;
      return { error: "Asset not found" };
    }
    await rm(path, { force: true });
    return { ok: true };
  });
