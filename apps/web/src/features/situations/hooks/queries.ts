"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  deleteCollectionItem,
  listCollection,
  saveCollectionItem,
} from "@/features/library/collections";

import { normalizeSituation, type Situation } from "../lib/template";

export const situationsQueryKey = ["collections", "situations"] as const;

/** Most recently edited first, so fresh work surfaces at the top of the list. */
function sortSituations(situations: Situation[]) {
  return [...situations].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

/**
 * Situation library backed by the local collections API. Reads normalize each
 * stored record so the rest of the app always sees a complete {@link Situation};
 * writes patch the cache in place to skip a refetch round trip.
 */
export function useSituations() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: situationsQueryKey,
    queryFn: async () => {
      const { items } = await listCollection("situations");
      return sortSituations(
        items.map((item, index) =>
          normalizeSituation(item, `Situation ${index + 1}`)
        )
      );
    },
  });

  const saveMutation = useMutation({
    mutationFn: (situation: Situation) =>
      saveCollectionItem("situations", situation),
    onSuccess: (_saved, situation) => {
      queryClient.setQueryData<Situation[]>(situationsQueryKey, (current) => {
        const list = current ?? [];
        const exists = list.some((item) => item.id === situation.id);
        const next = exists
          ? list.map((item) => (item.id === situation.id ? situation : item))
          : [situation, ...list];
        return sortSituations(next);
      });
    },
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => deleteCollectionItem("situations", id),
    onSuccess: (_result, id) => {
      queryClient.setQueryData<Situation[]>(situationsQueryKey, (current) =>
        (current ?? []).filter((item) => item.id !== id)
      );
    },
  });

  return {
    situations: query.data ?? [],
    isPending: query.isPending,
    save: saveMutation,
    remove: removeMutation,
  };
}
