import { mkdir, rename, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { EncodeVibeBody } from "@nai-desktop-studio/novelai";
import { configDir } from "./paths";

/**
 * Content-addressed cache for vibe encodes.
 *
 * An encode costs 2 Anlas and is a pure function of (image, information
 * extracted, model) — the same three inputs always produce the same result.
 * So the result is kept on disk under exactly that key, and a vibe is paid
 * for once no matter where it came from: a style, the panel, a re-run.
 *
 * This sits beside the reference library's per-entry cache rather than
 * replacing it. That one is pinned to a single model so a curated entry
 * survives model switches; this one follows the generation model, which is
 * what generation-time encodes actually use.
 */
function cacheDir(): string {
  return join(configDir(), "vibe-cache");
}

const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const MODEL_PATTERN = /^[a-z0-9.-]+$/;

/** The hash side of the key: sha256 over the base64 string itself. */
export function hashVibeImage(imageBase64: string): string {
  const hasher = new Bun.CryptoHasher("sha256");
  hasher.update(imageBase64);
  return hasher.digest("hex");
}

/**
 * One file per key. information_extracted goes in verbatim (it is a number in
 * [0,1], so String() is filename-safe); the model name is validated because it
 * lands in a path.
 */
function cachePath(
  sha256: string,
  infoExtracted: number,
  model: string
): string | null {
  if (!SHA256_PATTERN.test(sha256)) return null;
  if (!MODEL_PATTERN.test(model)) return null;
  return join(cacheDir(), `${sha256}.${String(infoExtracted)}.${model}.txt`);
}

export async function isVibeCached(
  sha256: string,
  infoExtracted: number,
  model: string
): Promise<boolean> {
  const path = cachePath(sha256, infoExtracted, model);
  if (!path) return false;
  return Bun.file(path).exists();
}

async function writeAtomic(target: string, data: string): Promise<void> {
  await mkdir(cacheDir(), { recursive: true });
  const tmp = `${target}.${crypto.randomUUID()}.tmp`;
  await writeFile(tmp, data);
  await rename(tmp, target).catch(async (error: unknown) => {
    await rm(tmp, { force: true });
    throw error;
  });
}

/**
 * Wraps an encoder with the cache. A hit never touches the network; a miss
 * pays once and files the result. An unwritable cache degrades to paying —
 * generation must not fail because a disk write did.
 */
export function cachedEncodeVibe(
  encode: (request: EncodeVibeBody) => Promise<string>
): (request: EncodeVibeBody) => Promise<string> {
  return async (request) => {
    const path = cachePath(
      hashVibeImage(request.image),
      request.information_extracted ?? 0.7,
      request.model
    );
    if (!path) return encode(request);

    const file = Bun.file(path);
    if (await file.exists()) return file.text();

    const encoded = await encode(request);
    await writeAtomic(path, encoded).catch(() => undefined);
    return encoded;
  };
}
