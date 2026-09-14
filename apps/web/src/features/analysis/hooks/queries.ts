"use client";

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { analyzeArtists, downloadModel, listModels } from "../lib/api";

export const modelsQueryKey = ["analysis", "models"] as const;

/**
 * The local models and how far along their downloads are.
 *
 * Byte counts live only in the server's status, so this polls while a download
 * runs. The rest of the time a model that is present stays present, and there
 * is nothing to ask about.
 */
export function useAnalysisModels() {
  const query = useQuery({
    queryKey: modelsQueryKey,
    queryFn: () => listModels(),
    select: (data) => data.items,
    // The callback sees the raw response, not the selected value.
    refetchInterval: (current) =>
      current.state.data?.items.some((item) => item.downloading) ? 1000 : false,
  });
  const models = query.data ?? [];

  return {
    models,
    artistModels: models.filter((model) => model.role === "artist"),
    isPending: query.isPending,
  };
}

export function useDownloadModel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => downloadModel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: modelsQueryKey });
    },
  });
}

/**
 * What the downloaded artist models make of one library image.
 *
 * The answer cannot change — the image and the models are fixed — so it is
 * never refetched once it lands. The ready models are part of the key: a
 * model that finishes downloading while the dialog is open is a new question.
 * A new lookup tag is a new key too, but the server keeps the image's ranking,
 * so that round trip is a map read rather than another run of the model; the
 * previous answer stays on screen meanwhile instead of flashing a spinner.
 */
export function useArtistAnalysis(
  imageId: string | null,
  artist: string,
  readyModels: string[],
  enabled: boolean
) {
  return useQuery({
    queryKey: ["analysis", "artists", imageId, artist, readyModels] as const,
    queryFn: () =>
      analyzeArtists({
        image: { imageId: imageId! },
        artist: artist || undefined,
        // Enough that filtering out small artists still leaves a full list.
        limit: 200,
      }),
    enabled: enabled && imageId !== null && readyModels.length > 0,
    staleTime: Infinity,
    placeholderData: keepPreviousData,
  });
}
