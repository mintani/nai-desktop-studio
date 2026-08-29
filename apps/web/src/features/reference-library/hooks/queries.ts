"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { bytesToBase64 } from "@/lib/base64";

import {
  createReference,
  deleteReference,
  listReferences,
  referenceImageUrl,
  updateReference,
  type ReferenceMetadata,
} from "../lib/api";
import { normalizeReference, type ReferenceEntry } from "../types/reference";

export const referencesQueryKey = ["references"] as const;

function sortReferences(entries: ReferenceEntry[]) {
  return [...entries].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

/** A new entry, made from an image the person just picked. */
export type NewReference = {
  metadata: ReferenceMetadata;
  imageBase64: string;
  contentType: string;
};

/**
 * The saved reference images.
 *
 * The server owns an entry whole — image, settings and the cached encode live
 * in one directory — so creating and deleting are each one request, and the
 * encode is dropped server-side when a setting makes it wrong.
 */
export function useReferences() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: referencesQueryKey,
    queryFn: async () => {
      const { items } = await listReferences();
      return sortReferences(
        items.map((item, index) =>
          normalizeReference(item, `Reference ${index + 1}`)
        )
      );
    },
  });

  function put(saved: ReferenceEntry) {
    queryClient.setQueryData<ReferenceEntry[]>(
      referencesQueryKey,
      (current) => {
        const list = current ?? [];
        const exists = list.some((item) => item.id === saved.id);
        return sortReferences(
          exists
            ? list.map((item) => (item.id === saved.id ? saved : item))
            : [saved, ...list]
        );
      }
    );
  }

  const create = useMutation({
    mutationFn: async (input: NewReference) =>
      normalizeReference(
        await createReference(
          input.metadata,
          input.imageBase64,
          input.contentType
        ),
        input.metadata.name
      ),
    onSuccess: put,
  });

  const save = useMutation({
    mutationFn: async (entry: ReferenceEntry) =>
      normalizeReference(await updateReference(entry), entry.name),
    onSuccess: put,
  });

  const remove = useMutation({
    mutationFn: async (entry: ReferenceEntry) => {
      await deleteReference(entry.id);
      return entry;
    },
    onSuccess: (entry) => {
      queryClient.setQueryData<ReferenceEntry[]>(
        referencesQueryKey,
        (current) => (current ?? []).filter((item) => item.id !== entry.id)
      );
    },
  });

  return {
    references: query.data ?? [],
    isPending: query.isPending,
    create,
    save,
    remove,
  };
}

/**
 * Builds the create input for an independent copy: the image bytes are
 * re-fetched so the copy owns its own file. The copy starts unencoded, but
 * encoding the same image at the same settings hits the server's
 * content-addressed cache, so it normally costs nothing until the copy's
 * settings diverge.
 */
export async function duplicateReferenceInput(
  source: ReferenceEntry,
  name: string
): Promise<NewReference | null> {
  try {
    const response = await fetch(referenceImageUrl(source.id));
    if (!response.ok) return null;
    const blob = await response.blob();
    return {
      metadata: {
        name,
        groupName: source.groupName,
        kind: source.kind,
        strength: source.strength,
        infoExtracted: source.infoExtracted,
        referenceType: source.referenceType,
        fidelity: source.fidelity,
      },
      imageBase64: bytesToBase64(new Uint8Array(await blob.arrayBuffer())),
      contentType: blob.type || "image/png",
    };
  } catch {
    return null;
  }
}
