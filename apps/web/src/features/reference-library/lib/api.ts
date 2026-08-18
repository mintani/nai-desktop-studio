import { apiRequest, serverUrl } from "@/lib/api-client";

import type { ReferenceEntry, ReferenceKind } from "../types/reference";

/** What a generation needs from one library entry. */
export type ResolvedReference = {
  id: string;
  kind: ReferenceKind;
  /** Base64 of the image. Empty for a vibe. */
  image: string;
  /** The cached encode. Empty for a precise reference. */
  encoded: string;
  referenceType: string;
  strength: number;
  fidelity: number;
};

/** The metadata the server accepts. The image is set once, when created. */
export type ReferenceMetadata = Pick<
  ReferenceEntry,
  | "name"
  | "groupName"
  | "kind"
  | "strength"
  | "infoExtracted"
  | "referenceType"
  | "fidelity"
>;

function metadataOf(entry: ReferenceEntry): ReferenceMetadata {
  return {
    name: entry.name,
    groupName: entry.groupName,
    kind: entry.kind,
    strength: entry.strength,
    infoExtracted: entry.infoExtracted,
    referenceType: entry.referenceType,
    fidelity: entry.fidelity,
  };
}

export function listReferences() {
  return apiRequest<{ items: ReferenceEntry[] }>("/references");
}

/**
 * Creates an entry from an image and its settings in one request.
 *
 * The server writes the image and the metadata into one directory, so there is
 * no moment where one exists without the other.
 */
export function createReference(
  metadata: ReferenceMetadata,
  imageBase64: string,
  contentType: string
) {
  return apiRequest<ReferenceEntry>("/references", {
    method: "POST",
    body: { ...metadata, imageBase64, contentType },
  });
}

export function updateReference(entry: ReferenceEntry) {
  return apiRequest<ReferenceEntry>(`/references/${entry.id}`, {
    method: "PUT",
    body: metadataOf(entry),
  });
}

/** Removes the image, the metadata and any cached encode together. */
export function deleteReference(id: string) {
  return apiRequest<{ ok: boolean }>(`/references/${id}`, { method: "DELETE" });
}

/** Where to show an entry's image from. */
export function referenceImageUrl(id: string) {
  return serverUrl(`/references/${id}/image`);
}

/**
 * Asks the server for the entries a run needs.
 *
 * Any vibe without a cached encode is encoded here — once, at 2 Anlas — and
 * kept. Entries that cannot be read are left out rather than failing the call,
 * so one broken record does not cost a whole run.
 */
export async function resolveReferences(ids: string[]) {
  if (ids.length === 0) return [];
  const { items } = await apiRequest<{ items: ResolvedReference[] }>(
    "/references/resolve",
    { method: "POST", body: { ids } }
  );
  return items;
}

/** Drops the cached encode, so the next use pays for a fresh one. */
export function clearEncodedVibe(id: string) {
  return apiRequest<{ ok: boolean }>(`/references/${id}/encoded`, {
    method: "DELETE",
  });
}
