import { serverUrl } from "@/lib/api-client";

import type { GeneratedImage } from "../types/image";

/** Turns the server-relative path into an absolute URL for display. */
export function resolveImageSrc(image: GeneratedImage) {
  return serverUrl(image.path);
}

/**
 * The small version, for anywhere the image is drawn smaller than it is: the
 * history strip and the grid tiles. Loading the original to fill a 48px tile is
 * where a long history gets heavy — a few hundred of them is hundreds of
 * megabytes of transfer and several times that once decoded.
 *
 * Records written before thumbnails existed have no `thumbPath`, so the
 * original is the fallback.
 */
export function resolveThumbSrc(image: GeneratedImage) {
  return serverUrl(image.thumbPath || image.path);
}

export function downloadImage(image: GeneratedImage) {
  const link = document.createElement("a");
  link.href = resolveImageSrc(image);
  link.download = `${image.id}.png`;
  document.body.append(link);
  link.click();
  link.remove();
}

/** Reports success so the caller can show a translated message. */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
