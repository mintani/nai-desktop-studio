/**
 * Encodes bytes as base64 without the data URL header, which is the form the
 * NovelAI API takes images in.
 */
export function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  // Passing everything to btoa at once overflows the argument list, so build it
  // up in chunks.
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }

  return btoa(binary);
}
