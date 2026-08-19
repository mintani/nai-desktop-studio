"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

import { clearImages, deleteImage, listImages } from "../lib/api";
import type { GeneratedImage } from "../types/image";

const HISTORY_LIMIT = 200;

export const imagesQueryKey = ["images"] as const;

/**
 * Library of saved images. The server's output directory is the only storage,
 * so right after generation we splice into the cache instead of refetching and
 * show it in the history immediately.
 */
export function useImageLibrary() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: imagesQueryKey,
    queryFn: () => listImages(HISTORY_LIMIT),
    select: (data) => data.images,
  });

  const addImage = useCallback(
    (image: GeneratedImage) => {
      queryClient.setQueryData<{ images: GeneratedImage[] }>(
        imagesQueryKey,
        (current) => ({
          // Drop any copy already in the cache. A refetch that lands between
          // the save and this splice would otherwise leave the same id in the
          // list twice, and the history renders by id.
          images: [
            image,
            ...(current?.images ?? []).filter((item) => item.id !== image.id),
          ],
        })
      );
    },
    [queryClient]
  );

  const remove = useMutation({
    mutationFn: (id: string) => deleteImage(id),
    onSuccess: (_result, id) => {
      queryClient.setQueryData<{ images: GeneratedImage[] }>(
        imagesQueryKey,
        (current) => ({
          images: (current?.images ?? []).filter((image) => image.id !== id),
        })
      );
    },
  });

  /**
   * Removes several images at once.
   *
   * One request each, in order: the server deletes a file per call and a local
   * one is fast, while firing dozens at once only makes the failure modes
   * harder to report. The cache is updated once at the end so the grid does
   * not reflow per image.
   */
  const removeMany = useMutation({
    mutationFn: async (ids: string[]) => {
      const deleted: string[] = [];
      for (const id of ids) {
        try {
          await deleteImage(id);
          deleted.push(id);
        } catch {
          // An image already gone from disk should not stop the rest.
        }
      }
      return deleted;
    },
    onSuccess: (deleted) => {
      const gone = new Set(deleted);
      queryClient.setQueryData<{ images: GeneratedImage[] }>(
        imagesQueryKey,
        (current) => ({
          images: (current?.images ?? []).filter(
            (image) => !gone.has(image.id)
          ),
        })
      );
    },
  });

  const clear = useMutation({
    mutationFn: () => clearImages(),
    onSuccess: () => {
      queryClient.setQueryData(imagesQueryKey, { images: [] });
    },
  });

  return {
    images: query.data ?? [],
    isPending: query.isPending,
    addImage,
    deleteImage: remove.mutate,
    deleteImages: removeMany.mutateAsync,
    isDeleting: removeMany.isPending,
    clearImages: clear.mutate,
  };
}
