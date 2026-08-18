"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  deleteAssetsByPath,
  deleteCollectionItem,
  listCollection,
  saveCollectionItem,
} from "@/features/library/collections";

import { clearEncodedVibe } from "../lib/api";
import { normalizeReference, type ReferenceEntry } from "../types/reference";

export const referencesQueryKey = ["collections", "references"] as const;

function sortReferences(entries: ReferenceEntry[]) {
  return [...entries].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

/**
 * The saved reference images. Backed by the same local collections API as
 * characters and styles; the encode itself lives on the server, keyed by id.
 */
export function useReferences() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: referencesQueryKey,
    queryFn: async () => {
      const { items } = await listCollection("references");
      return sortReferences(
        items.map((item, index) =>
          normalizeReference(item, `Reference ${index + 1}`)
        )
      );
    },
  });

  const save = useMutation({
    mutationFn: async (entry: ReferenceEntry) => {
      // A changed extraction makes the stored encode wrong, so it goes first.
      // Leaving it would send a blob that no longer matches the settings.
      const previous = query.data?.find((item) => item.id === entry.id);
      if (previous && previous.infoExtracted !== entry.infoExtracted) {
        await clearEncodedVibe(entry.id).catch(() => undefined);
        entry = { ...entry, encodedAt: null };
      }
      await saveCollectionItem("references", entry);
      return entry;
    },
    onSuccess: (saved) => {
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
    },
  });

  const remove = useMutation({
    mutationFn: async (entry: ReferenceEntry) => {
      await clearEncodedVibe(entry.id).catch(() => undefined);
      if (entry.imagePath) await deleteAssetsByPath([entry.imagePath]);
      await deleteCollectionItem("references", entry.id);
    },
    onSuccess: (_result, entry) => {
      queryClient.setQueryData<ReferenceEntry[]>(
        referencesQueryKey,
        (current) => (current ?? []).filter((item) => item.id !== entry.id)
      );
    },
  });

  return {
    references: query.data ?? [],
    isPending: query.isPending,
    save,
    remove,
  };
}
