import { apiRequest } from "@/lib/api-client";

/**
 * The local analysis endpoints.
 *
 * They run a model that is not shipped with the app, so they can answer 409
 * naming the model that is missing. Callers read the model list first rather
 * than treating that as a failure.
 */
export type ModelRole = "artist";

export type ModelStatus = {
  id: string;
  role: ModelRole;
  /** Shown to the person. */
  label: string;
  /** Where the weights come from. */
  source: string;
  /** Total size of the model's files. */
  bytes: number;
  ready: boolean;
  downloading: boolean;
  /** Bytes fetched so far by the running download. */
  received: number;
  error: string | null;
};

/** A picture the server can read: one already in the library, or raw bytes. */
export type ImageRef = { imageId: string } | { imageBase64: string };

/**
 * Where the asked-for tag landed: its score and 1-based rank among every
 * artist the model knows, or null when the model has never heard of it.
 */
export type ArtistPlace = {
  name: string;
  score: number;
  rank: number;
  posts: number | null;
};

export type ArtistLookup = ArtistPlace | null;

export type ArtistResult = {
  model: string;
  label: string;
  /** How many artists the model knows — the denominator of every score. */
  artists: number;
  /** Best first. `posts` is the tag's Danbooru post count, null if unknown. */
  candidates: { name: string; score: number; posts: number | null }[];
  lookup: ArtistLookup;
  /** The artist tags the image's prompt names, placed in the full ranking. */
  mentioned: ArtistPlace[];
};

/** One entry per artist model that is downloaded. */
export type ArtistAnalysis = { results: ArtistResult[] };

export function listModels() {
  return apiRequest<{ items: ModelStatus[] }>("/analysis/models");
}

/**
 * Starts the download and returns at once. Progress shows up only in
 * `listModels`, so the caller polls that while it runs.
 */
export function downloadModel(id: string) {
  return apiRequest<{ ok: boolean }>(`/analysis/models/${id}/download`, {
    method: "POST",
  });
}

export function analyzeArtists(body: {
  image: ImageRef;
  artist?: string;
  limit?: number;
}) {
  return apiRequest<ArtistAnalysis>("/analysis/artists", {
    method: "POST",
    body,
  });
}
