"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  cloneAsset,
  deleteAssetsByPath,
  deleteCollectionItem,
  listCollection,
  saveCollectionItem,
} from "@/features/library/collections";

import { normalizeCharacter, type Character } from "../lib/template";

export const charactersQueryKey = ["collections", "characters"] as const;

/**
 * Characters stored in the local `characters` collection. The store only
 * guarantees an `id`, so each record is normalized on read. Save is an upsert by
 * id, and both mutations patch the cache directly — the collection is the only
 * storage, so there is nothing to refetch against.
 */
export function useCharacters() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: charactersQueryKey,
    queryFn: async () => {
      const { items } = await listCollection("characters");
      return items.map((item, index) =>
        normalizeCharacter(item, `Character ${index + 1}`)
      );
    },
    staleTime: Infinity,
  });

  const save = useMutation({
    mutationFn: (character: Character) =>
      saveCollectionItem("characters", character),
    onSuccess: (saved) => {
      queryClient.setQueryData<Character[]>(charactersQueryKey, (current) => {
        const list = current ?? [];
        return list.some((item) => item.id === saved.id)
          ? list.map((item) => (item.id === saved.id ? saved : item))
          : [saved, ...list];
      });
    },
  });

  // Deleting takes the character's picture with it, so the assets directory
  // doesn't keep images nothing points at any more.
  const remove = useMutation({
    mutationFn: async (character: Character) => {
      if (character.imagePath) await deleteAssetsByPath([character.imagePath]);
      await deleteCollectionItem("characters", character.id);
    },
    onSuccess: (_result, character) => {
      queryClient.setQueryData<Character[]>(charactersQueryKey, (current) =>
        (current ?? []).filter((item) => item.id !== character.id)
      );
    },
  });

  return {
    characters: query.data ?? [],
    isPending: query.isPending,
    save,
    remove,
  };
}

/**
 * An independent copy. The picture is re-uploaded so the copy owns it, and
 * deleting either character never blanks the other. An image whose bytes can't
 * be re-fetched is dropped rather than shared.
 */
export async function duplicateCharacter(
  source: Character,
  name: string
): Promise<Character> {
  const now = new Date().toISOString();

  return {
    ...source,
    id: crypto.randomUUID(),
    name,
    imagePath: source.imagePath ? await cloneAsset(source.imagePath) : null,
    variables: source.variables.map((variable) => ({
      ...variable,
      id: crypto.randomUUID(),
    })),
    createdAt: now,
    updatedAt: now,
  };
}
