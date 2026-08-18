import { apiRequest, serverUrl } from "@/lib/api-client";
import { bytesToBase64 } from "@/lib/base64";

/**
 * Characters, situations and styles are stored as plain JSON collections on the
 * local server. The server only guarantees each record has an `id` — the shape
 * is owned here, and each feature normalizes what it reads. That keeps one
 * schema instead of two that can drift.
 */
export const COLLECTIONS = [
  "characters",
  "situations",
  "styles",
  "references",
] as const;
export type CollectionName = (typeof COLLECTIONS)[number];

export function listCollection(name: CollectionName) {
  return apiRequest<{ items: unknown[] }>(`/collections/${name}`);
}

/** Upsert by id: the client mints ids, so create and update are the same call. */
export function saveCollectionItem<T extends { id: string }>(
  name: CollectionName,
  item: T
) {
  return apiRequest<T>(`/collections/${name}/${item.id}`, {
    method: "PUT",
    body: item,
  });
}

export function deleteCollectionItem(name: CollectionName, id: string) {
  return apiRequest<{ ok: boolean }>(`/collections/${name}/${id}`, {
    method: "DELETE",
  });
}

export type StoredAsset = { id: string; path: string };

/** Uploads an image and returns the server-relative path to serve it from. */
export function uploadAsset(imageBase64: string, contentType: string) {
  return apiRequest<StoredAsset>("/assets", {
    method: "POST",
    body: { imageBase64, contentType },
  });
}

export function deleteAsset(id: string) {
  return apiRequest<{ ok: boolean }>(`/assets/${id}`, { method: "DELETE" });
}

/** Turns a stored asset path into a URL the browser can load. */
export function assetUrl(path: string) {
  return serverUrl(path);
}

/**
 * Assets are served from `/assets/<id>/...`, but a record only stores the path.
 * The id is what `deleteAsset` needs, so it is recovered from the path segment.
 */
export function assetIdFromPath(path: string): string | null {
  return /\/assets\/([^/]+)/.exec(path)?.[1] ?? null;
}

/** Best-effort delete: a failed asset removal must not block the record write. */
export async function deleteAssetsByPath(
  paths: readonly string[]
): Promise<void> {
  await Promise.all(
    paths.map(async (path) => {
      const id = assetIdFromPath(path);
      if (id) await deleteAsset(id).catch(() => undefined);
    })
  );
}

/**
 * Re-fetches an asset's bytes and uploads them as a new asset. Duplicating a
 * record has to duplicate its images too, otherwise deleting either copy would
 * take the other's pictures with it.
 */
export async function cloneAsset(path: string): Promise<string | null> {
  try {
    const response = await fetch(assetUrl(path));
    if (!response.ok) return null;
    const blob = await response.blob();
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const uploaded = await uploadAsset(
      bytesToBase64(bytes),
      blob.type || "image/png"
    );
    return uploaded.path;
  } catch {
    return null;
  }
}
