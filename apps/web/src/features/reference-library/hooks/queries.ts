"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createReference,
  deleteReference,
  listReferences,
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
