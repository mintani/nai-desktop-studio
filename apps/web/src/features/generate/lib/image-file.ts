import { bytesToBase64 } from "@/lib/base64";

const MAX_IMAGE_BYTES = 10_000_000;

export type ReadImageResult =
  | { ok: true; imageBase64: string; previewUrl: string }
  | { ok: false; reason: "not-image" | "too-large" };

/**
 * Loads a reference image. It is sent to NovelAI as base64 (without the data URL
 * header), but the preview uses an object URL to avoid putting a huge data URL
 * in the DOM. Returns a reason rather than showing an error, so the caller can
 * translate it.
 */
export async function readImageFile(file: File): Promise<ReadImageResult> {
  if (!file.type.startsWith("image/")) {
    return { ok: false, reason: "not-image" };
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return { ok: false, reason: "too-large" };
  }

  const buffer = await file.arrayBuffer();

  return {
    ok: true,
    imageBase64: bytesToBase64(new Uint8Array(buffer)),
    previewUrl: URL.createObjectURL(file),
  };
}
