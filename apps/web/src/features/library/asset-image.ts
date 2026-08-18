import { bytesToBase64 } from "@/lib/base64";

import { assetUrl } from "./collections";

/**
 * Reads a stored asset back as base64. Styles keep their vibe and reference
 * images on the server as paths, but a generation has to send the bytes, so
 * applying a style has to fetch them again.
 */
export async function loadAssetAsBase64(path: string) {
  const response = await fetch(assetUrl(path));
  if (!response.ok) {
    throw new Error(`Failed to load asset (${response.status})`);
  }

  const buffer = await response.arrayBuffer();
  return bytesToBase64(new Uint8Array(buffer));
}
