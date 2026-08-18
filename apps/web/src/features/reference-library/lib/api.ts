import { apiRequest } from "@/lib/api-client";

import type { ReferenceKind } from "../types/reference";

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
