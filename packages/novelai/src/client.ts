import {
  AREA_COEFFICIENT,
  CHARACTER_REFERENCE_EXTRA_ANLAS,
  LIGHTWEIGHT_OPUS_MAX_PIXELS,
  LIGHTWEIGHT_OPUS_MAX_STEPS,
  MAX_PER_IMAGE_ANLAS,
  NOVELAI_API_BASE,
  NOVELAI_IMAGE_BASE,
  SMEA_DYN_MULTIPLIER,
  SMEA_MULTIPLIER,
  STEP_AREA_COEFFICIENT,
  V5_COST_MULTIPLIER,
  VIBE_EXTRA_ANLAS,
  VIBE_FREE_COUNT,
} from "./constants";
import { buildGeneratePayload, resolveModel, resolveSize } from "./payload";
import { isV5Model } from "./schemas";
import { iterateStreamFrames } from "./sse";
import type { StreamFrame } from "./sse";
import { extractAllFilesFromZip, isZipPayload } from "./zip";
import type {
  EncodeVibeBody,
  EstimateAnlasBody,
  GenerateImageBody,
  GenerateImageStreamBody,
} from "./schemas";

/**
 * The parameters actually used for generation, for save metadata. seed is the
 * base seed sent in the payload; NovelAI increments it per sample, so sample i
 * uses seed + i.
 */
export type GenerationMeta = {
  model: string;
  prompt: string;
  negativePrompt: string;
  width: number;
  height: number;
  steps: number;
  scale: number;
  sampler: string;
  seed: number;
};

/** One image produced by {@link NovelAIClient.generate}. */
export type GeneratedImage = {
  image: Uint8Array;
  contentType: string;
  filename: string;
};

/**
 * Result of {@link NovelAIClient.generateStream}: streamed frames and
 * metadata.
 */
export type StreamResult = {
  meta: GenerationMeta;
  frames: AsyncGenerator<StreamFrame>;
};

/** A lenient type covering only the parts of /user/subscription we need. */
type SubscriptionResponse = {
  tier?: number;
  active?: boolean;
  // The response has no dedicated "unlimited generation" flag; use the closest
  // one, unlimitedMaxPriority.
  perks?: { unlimitedMaxPriority?: boolean };
  trainingStepsLeft?: {
    fixedTrainingStepsLeft?: number;
    purchasedTrainingSteps?: number;
  };
};

/** Subscription status. anlas is the total remaining points. */
export type SubscriptionInfo = {
  tier: number;
  active: boolean;
  anlas: number;
  unlimitedGeneration: boolean;
};

export type NovelAIClientOptions = {
  apiKey: string;
  /** Base URL for the image API. Defaults to https://image.novelai.net */
  imageBase?: string;
  /** Base URL for the account API. Defaults to https://api.novelai.net */
  apiBase?: string;
  /**
   * Wraps every vibe encode this client performs — the exported encodeVibe and
   * the ones made while building a generation payload. Encoding costs Anlas,
   * so a host can slot a cache in front without this package knowing where or
   * how the results are kept.
   */
  wrapEncodeVibe?: (
    encode: (request: EncodeVibeBody) => Promise<string>
  ) => (request: EncodeVibeBody) => Promise<string>;
};

/** Extract message from a JSON NovelAI error body, or the raw body otherwise. */
function extractErrorMessage(detail: string): string {
  if (!detail) return "";
  try {
    const parsed = JSON.parse(detail) as { message?: unknown };
    if (typeof parsed.message === "string" && parsed.message) {
      return parsed.message;
    }
  } catch {
    // If it is not JSON, use the body as-is.
  }
  return detail;
}

/**
 * Convert a NovelAI error response into a Response (JSON) you can return as-is.
 */
export async function createNovelAIError(response: Response) {
  const detail = extractErrorMessage(await response.text());
  const fallback =
    detail ||
    (response.status === 401
      ? "Invalid API key"
      : response.status === 402
        ? "Insufficient credits or subscription required"
        : response.status === 429
          ? "Rate limit exceeded"
          : `NovelAI request failed with status ${response.status}`);

  return new Response(
    JSON.stringify({ error: fallback, status: response.status }),
    {
      status: response.status,
      headers: { "Content-Type": "application/json" },
    }
  );
}

// NovelAI returns 429 when concurrent requests pile up. Wait a bit and retry
// so the user sees a success after queuing, not an error.
const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504]);
const MAX_RETRIES = 3;
const MAX_BACKOFF_MS = 10_000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Prefer Retry-After (seconds); otherwise use exponential backoff plus jitter.
 */
function retryDelayMs(attempt: number, retryAfter: string | null): number {
  const seconds = retryAfter ? Number(retryAfter) : Number.NaN;
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.min(seconds * 1000, MAX_BACKOFF_MS);
  }
  const backoff = Math.min(1000 * 2 ** attempt, MAX_BACKOFF_MS);
  // Add jitter so simultaneous 429s do not collide again at the same interval.
  return backoff + Math.floor(Math.random() * 500);
}

/** fetch that retries 429/5xx with exponential backoff. */
async function fetchWithRetry(
  input: string,
  init: RequestInit
): Promise<Response> {
  for (let attempt = 0; ; attempt++) {
    const response = await fetch(input, init);
    if (
      response.ok ||
      !RETRYABLE_STATUSES.has(response.status) ||
      attempt >= MAX_RETRIES
    ) {
      return response;
    }
    const delay = retryDelayMs(attempt, response.headers.get("retry-after"));
    // Discard the failed response body before retrying to free the connection.
    await response.body?.cancel().catch(() => {});
    await sleep(delay);
  }
}

/** Estimate Anlas (generation cost). A pure calculation, no API call needed. */
export function estimateAnlas(body: EstimateAnlasBody) {
  const model = resolveModel(body.model);
  const { width, height } = resolveSize(body.size);
  const steps = body.steps ?? 28;
  const nSamples = body.n_samples ?? 1;
  const area = width * height;

  const strengthFactor =
    body.inpaint_strength != null ? 1 : (body.i2i_strength ?? 1);

  let multiplier = 1;
  if (body.sm) multiplier = body.sm_dyn ? SMEA_DYN_MULTIPLIER : SMEA_MULTIPLIER;

  const baseCost = Math.ceil(
    AREA_COEFFICIENT * area + STEP_AREA_COEFFICIENT * area * steps
  );
  const versionMultiplier = isV5Model(model) ? V5_COST_MULTIPLIER : 1;
  const perImageAnlas = Math.max(
    Math.ceil(baseCost * versionMultiplier * multiplier * strengthFactor),
    2
  );

  if (perImageAnlas > MAX_PER_IMAGE_ANLAS) {
    throw new Error(
      `Estimated per-image cost exceeds the supported cap of ${MAX_PER_IMAGE_ANLAS} Anlas`
    );
  }

  // Vibe surcharges exist on V4/V4.5 only. V3 predates vibes as billed here,
  // and V5 has no vibe transfer at all, so the prefix check excludes both.
  const supportsV4Costs = model.startsWith("nai-diffusion-4");
  // V5 sits outside Opus unlimited (it is battery-metered instead), so the
  // free-sample discount never applies there. The estimate is what a
  // generation costs once the battery is empty; the battery itself is not
  // visible to the API.
  const opusDiscountApplied = Boolean(
    body.is_opus &&
    !isV5Model(model) &&
    area <= LIGHTWEIGHT_OPUS_MAX_PIXELS &&
    steps <= LIGHTWEIGHT_OPUS_MAX_STEPS
  );
  const billableSamples = opusDiscountApplied
    ? Math.max(nSamples - 1, 0)
    : nSamples;
  const baseAnlas = perImageAnlas * billableSamples;
  const characterReferenceAnlas =
    Math.max(body.character_reference_count ?? 0, 0) *
    (CHARACTER_REFERENCE_EXTRA_ANLAS * nSamples);
  const vibeEncodingAnlas = supportsV4Costs
    ? Math.max(body.uncached_vibe_count ?? 0, 0) * VIBE_EXTRA_ANLAS
    : 0;
  const vibeReferenceAnlas = supportsV4Costs
    ? Math.max((body.vibe_reference_count ?? 0) - VIBE_FREE_COUNT, 0) *
      VIBE_EXTRA_ANLAS
    : 0;

  return {
    model,
    width,
    height,
    steps,
    requested_samples: nSamples,
    billable_samples: billableSamples,
    strength_factor: strengthFactor,
    per_image_anlas: perImageAnlas,
    base_anlas: baseAnlas,
    character_reference_anlas: characterReferenceAnlas,
    vibe_encoding_anlas: vibeEncodingAnlas,
    vibe_reference_anlas: vibeReferenceAnlas,
    opus_discount_applied: opusDiscountApplied,
    total_anlas:
      baseAnlas +
      characterReferenceAnlas +
      vibeEncodingAnlas +
      vibeReferenceAnlas,
  };
}

type GeneratePayload = Awaited<ReturnType<typeof buildGeneratePayload>>;

/** Build save metadata from the input and the resolved payload (seed, etc.). */
function buildMeta(
  body: GenerateImageBody | GenerateImageStreamBody,
  payload: GeneratePayload
): GenerationMeta {
  return {
    model: resolveModel(body.model),
    prompt: body.prompt,
    negativePrompt: body.negative_prompt ?? "",
    width: payload.parameters.width,
    height: payload.parameters.height,
    steps: payload.parameters.steps,
    scale: payload.parameters.scale,
    sampler: payload.parameters.sampler,
    seed: payload.parameters.seed,
  };
}

export type NovelAIClient = ReturnType<typeof createNovelAIClient>;

/**
 * A NovelAI client bound to one apiKey. Provides generation, encoding, and
 * subscription checks.
 */
export function createNovelAIClient({
  apiKey,
  imageBase = NOVELAI_IMAGE_BASE,
  apiBase = NOVELAI_API_BASE,
  wrapEncodeVibe,
}: NovelAIClientOptions) {
  const headers = () => ({
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  });

  async function rawEncodeVibe(request: EncodeVibeBody): Promise<string> {
    const response = await fetchWithRetry(`${imageBase}/ai/encode-vibe`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify(request),
    });

    if (!response.ok) throw await createNovelAIError(response);

    return Buffer.from(await response.arrayBuffer()).toString("base64");
  }

  // Every encode this client performs goes through the wrapper: the exported
  // encodeVibe and the ones made while building a generation payload alike.
  // An encode is a pure function of its request, so there is no such thing as
  // an encode that must not be served from a cache.
  const encodeVibe = wrapEncodeVibe
    ? wrapEncodeVibe(rawEncodeVibe)
    : rawEncodeVibe;

  /**
   * Generate one or more images. Passes n_samples through unchanged, so a
   * batch (n_samples > 1) comes back as a ZIP of all samples. meta.seed is the
   * base seed; the caller derives each image's seed as meta.seed + i.
   */
  async function generate(
    body: GenerateImageBody
  ): Promise<{ images: GeneratedImage[]; meta: GenerationMeta }> {
    const payload = await buildGeneratePayload(body, encodeVibe);
    const response = await fetchWithRetry(`${imageBase}/ai/generate-image`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify(payload),
    });

    if (!response.ok) throw await createNovelAIError(response);

    const data = new Uint8Array(await response.arrayBuffer());
    const meta = buildMeta(body, payload);

    if (isZipPayload(data, response.headers.get("content-type"))) {
      const extracted = await extractAllFilesFromZip(data, body.image_format);
      return {
        images: extracted.map((file) => ({
          image: new Uint8Array(file.data),
          contentType: file.contentType,
          filename: file.filename,
        })),
        meta,
      };
    }

    return {
      images: [
        {
          image: data,
          contentType:
            response.headers.get("content-type") ?? "application/octet-stream",
          filename: "novelai-output",
        },
      ],
      meta,
    };
  }

  async function generateStream(
    body: GenerateImageStreamBody
  ): Promise<StreamResult> {
    const payload = await buildGeneratePayload(body, encodeVibe);
    const response = await fetchWithRetry(
      `${imageBase}/ai/generate-image-stream`,
      {
        method: "POST",
        headers: headers(),
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) throw await createNovelAIError(response);
    if (!response.body) {
      throw new Error("NovelAI stream response body is empty");
    }

    return {
      meta: buildMeta(body, payload),
      frames: iterateStreamFrames(response.body),
    };
  }

  async function subscription(): Promise<SubscriptionInfo> {
    // /user/subscription lives on the image host (apiBase also defaults to it).
    const response = await fetchWithRetry(`${apiBase}/user/subscription`, {
      method: "GET",
      headers: headers(),
    });

    if (!response.ok) throw await createNovelAIError(response);

    const data = (await response.json()) as SubscriptionResponse;
    const steps = data.trainingStepsLeft;
    const anlas =
      (steps?.fixedTrainingStepsLeft ?? 0) +
      (steps?.purchasedTrainingSteps ?? 0);

    return {
      tier: typeof data.tier === "number" ? data.tier : 0,
      active: data.active ?? false,
      anlas,
      unlimitedGeneration: data.perks?.unlimitedMaxPriority ?? false,
    };
  }

  return { encodeVibe, generate, generateStream, subscription };
}
