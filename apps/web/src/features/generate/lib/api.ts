import { env } from "@nai-desktop-studio/env/web";

import { ApiError, apiRequest } from "@/lib/api-client";

import type { GeneratedImage } from "../types/image";
import type { AnlasEstimate, GenerateRequestBody } from "../types/generate";

const BASE_URL = env.VITE_SERVER_URL;

/** Encodes a vibe. Costs 2 Anlas per image, so call it once per batch. */
export async function encodeVibe(
  imageBase64: string,
  informationExtracted: number,
  model: string
) {
  const result = await apiRequest<{ data: string }>("/novelai/encode-vibe", {
    method: "POST",
    body: {
      image: imageBase64,
      information_extracted: informationExtracted,
      model,
    },
  });
  return result.data;
}

export function estimateAnlas(body: {
  model: string;
  size: string;
  steps: number;
  n_samples: number;
  character_reference_count?: number;
  vibe_reference_count?: number;
  uncached_vibe_count?: number;
  i2i_strength?: number;
  is_opus?: boolean;
}) {
  return apiRequest<AnlasEstimate>("/novelai/anlas-estimate", {
    method: "POST",
    body,
  });
}

/**
 * One request for the whole batch. Returns every image NovelAI produced, so the
 * response is always an array even for a single image.
 */
export function generateImages(
  body: GenerateRequestBody,
  signal?: AbortSignal
) {
  return apiRequest<{ images: GeneratedImage[] }>("/novelai/generate", {
    method: "POST",
    body,
    signal,
  });
}

export function listImages(limit?: number) {
  const query = limit === undefined ? "" : `?limit=${limit}`;
  return apiRequest<{ images: GeneratedImage[] }>(`/images${query}`);
}

export function deleteImage(id: string) {
  return apiRequest<{ ok: boolean }>(`/images/${id}`, { method: "DELETE" });
}

export function clearImages() {
  return apiRequest<{ ok: boolean; deleted: number }>("/images", {
    method: "DELETE",
  });
}

/** Normalized events streamed over SSE. See docs/api.md for the spec. */
export type GenerateStreamEvent =
  | { type: "preview"; image: string }
  | { type: "image"; image: GeneratedImage }
  | { type: "done" }
  | { type: "error"; message: string };

function parseSseChunk(chunk: string): GenerateStreamEvent | null {
  const dataLines: string[] = [];
  for (const line of chunk.split(/\r?\n/)) {
    if (line.startsWith("data:")) dataLines.push(line.slice(5).trimStart());
  }
  if (dataLines.length === 0) return null;

  try {
    return JSON.parse(dataLines.join("\n")) as GenerateStreamEvent;
  } catch {
    return null;
  }
}

/**
 * Receives one image's generation over SSE. Progress (preview) and the final
 * image (image) arrive in order, and the last image arrives already saved on the
 * server.
 */
export async function* generateImageStream(
  body: GenerateRequestBody,
  signal?: AbortSignal
): AsyncGenerator<GenerateStreamEvent> {
  const response = await fetch(`${BASE_URL}/novelai/generate-stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });

  if (!response.ok || !response.body) {
    const contentType = response.headers.get("content-type") ?? "";
    const message = contentType.includes("application/json")
      ? ((
          (await response.json().catch(() => null)) as { error?: string } | null
        )?.error ?? "Generation failed")
      : (await response.text().catch(() => "")) || "Generation failed";
    throw new ApiError(response.status, message);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const chunks = buffer.split(/\r?\n\r?\n/);
    buffer = chunks.pop() ?? "";

    for (const chunk of chunks) {
      const event = parseSseChunk(chunk);
      if (event) yield event;
    }
  }

  buffer += decoder.decode();
  for (const chunk of buffer.split(/\r?\n\r?\n/)) {
    const event = parseSseChunk(chunk);
    if (event) yield event;
  }
}
