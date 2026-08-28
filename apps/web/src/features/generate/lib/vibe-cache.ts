import { apiRequest } from "@/lib/api-client";

/**
 * Client side of the server's vibe-encode cache.
 *
 * The hash must match the server's: sha256 over the base64 string itself
 * (its UTF-8 bytes), not over the decoded image. Hashing the string spares
 * both sides a decode, and the string is just as canonical for the same bytes.
 */
export async function hashVibeImage(imageBase64: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(imageBase64)
  );
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export type VibeCacheQuery = {
  sha256: string;
  infoExtracted: number;
  model: string;
};

/**
 * Which of these vibes are already encoded on the server. On any failure every
 * vibe is reported uncached — when the answer decides whether to warn about
 * spending money, the safe wrong answer is "it will cost".
 */
export async function fetchVibeCacheStatus(
  items: VibeCacheQuery[]
): Promise<boolean[]> {
  if (items.length === 0) return [];
  try {
    const { cached } = await apiRequest<{ cached: boolean[] }>(
      "/novelai/vibe-cache/status",
      { method: "POST", body: { items } }
    );
    return items.map((_, index) => cached[index] === true);
  } catch {
    return items.map(() => false);
  }
}
