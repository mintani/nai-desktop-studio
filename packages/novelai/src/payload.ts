import {
  QUALITY_TAGS,
  SIZE_PRESETS,
  UC_PRESET_INT,
  UC_PRESET_TEXT,
  V5_UC_PRESET_TEXT,
} from "./constants";
import { isV4Model, isV45Model, isV5Model } from "./schemas";
import type {
  CharacterPosition,
  EncodeVibeBody,
  GenerateImageBody,
  GenerateImageStreamBody,
  ImageModel,
} from "./schemas";

export function resolveModel(model?: ImageModel) {
  return model ?? "nai-diffusion-4-5-full";
}

export function resolveSize(size: GenerateImageBody["size"]) {
  if (!size) return SIZE_PRESETS.portrait;
  if (typeof size === "string") return SIZE_PRESETS[size];
  if (size.width % 64 !== 0 || size.height % 64 !== 0) {
    throw new Error("width and height must be multiples of 64");
  }
  return size;
}

function resolvePosition(position?: CharacterPosition) {
  if (!position) return { x: 0.5, y: 0.5 };
  if (typeof position !== "string") return position;

  const x = "ABCDE".indexOf(position[0] ?? "") + 1;
  const y = "12345".indexOf(position[1] ?? "") + 1;
  if (x <= 0 || y <= 0) throw new Error(`invalid position preset: ${position}`);

  return { x: (x - 0.5) / 5, y: (y - 0.5) / 5 };
}

function createV4Prompts(
  prompt: string,
  negativePrompt: string,
  characters: GenerateImageBody["characters"]
) {
  const enabled = (characters ?? []).filter((c) => c.enabled ?? true);
  // Enable coordinates if any character sets a position. False when none do
  // (let the AI decide).
  const useCoords = enabled.some((c) => c.position !== undefined);

  return {
    v4_prompt: {
      caption: {
        base_caption: prompt,
        char_captions: enabled.map((c) => ({
          char_caption: c.prompt,
          centers: [resolvePosition(c.position)],
        })),
      },
      use_coords: useCoords,
      use_order: true,
    },
    v4_negative_prompt: {
      caption: {
        base_caption: negativePrompt,
        char_captions: enabled.map((c) => ({
          char_caption: c.negative_prompt ?? "",
          centers: [resolvePosition(c.position)],
        })),
      },
      legacy_uc: false,
    },
  };
}

function buildCharacterPrompts(characters: GenerateImageBody["characters"]) {
  return (characters ?? []).map((c) => ({
    prompt: c.prompt,
    uc: c.negative_prompt ?? "",
    center: resolvePosition(c.position),
    enabled: c.enabled ?? true,
  }));
}

function resolvePrompt(body: GenerateImageBody) {
  if (body.quality === false) return body.prompt;
  return `${body.prompt}${QUALITY_TAGS[resolveModel(body.model)]}`;
}

function resolveNegativePrompt(body: GenerateImageBody) {
  const presets = isV5Model(resolveModel(body.model))
    ? V5_UC_PRESET_TEXT
    : UC_PRESET_TEXT;
  return `${body.negative_prompt ?? ""}${presets[body.uc_preset ?? "light"]}`;
}

function resolveAction(body: GenerateImageBody | GenerateImageStreamBody) {
  if (body.inpaint) return "infill";
  if (body.i2i) return "img2img";
  return "generate";
}

/**
 * The model family a request actually runs on. V5 Curated has no inpainting
 * model yet, so the official app routes its inpaints to V4.5 Curated; that
 * request then has to follow V4.5 rules too (params_version, no transparency).
 */
function resolveEffectiveModel(
  body: GenerateImageBody | GenerateImageStreamBody
) {
  const model = resolveModel(body.model);
  if (body.inpaint && model === "nai-diffusion-5-curated") {
    return "nai-diffusion-4-5-curated";
  }
  return model;
}

function resolveApiModel(body: GenerateImageBody | GenerateImageStreamBody) {
  const model = resolveEffectiveModel(body);
  return body.inpaint ? `${model}-inpainting` : model;
}

function getStreamMode(body: GenerateImageBody | GenerateImageStreamBody) {
  return "stream" in body ? body.stream : undefined;
}

/**
 * Build the payload for NovelAI's /ai/generate-image. Vibes (controlnet) need
 * encoding at generation time, so the caller injects encodeVibe.
 */
export async function buildGeneratePayload(
  body: GenerateImageBody | GenerateImageStreamBody,
  encodeVibe: (request: EncodeVibeBody) => Promise<string>
) {
  const model = resolveModel(body.model);
  const effectiveModel = resolveEffectiveModel(body);
  const { width, height } = resolveSize(body.size);
  const prompt = resolvePrompt(body);
  const negativePrompt = resolveNegativePrompt(body);

  if (body.i2i && body.inpaint) {
    throw new Error("Cannot use both i2i and inpaint at the same time");
  }
  // Vibe transfer (reference_image_multiple) and precise reference
  // (director_reference_*) cannot be combined per NovelAI's spec. Reject it at
  // the payload layer too, to avoid double billing.
  if (body.controlnet && body.character_references?.length) {
    throw new Error(
      "Cannot use vibe transfer and precise reference at the same time"
    );
  }
  if (body.characters?.length && !isV4Model(model)) {
    throw new Error("Characters are only supported for V4 models");
  }
  if (body.character_references?.length && !isV45Model(model)) {
    throw new Error("Character references are only supported for V4.5 models");
  }
  if (body.controlnet && isV5Model(model)) {
    throw new Error("Vibe transfer is not supported for V5 models");
  }
  // Checked against the effective model: V5 Curated inpaints really run on
  // V4.5 Curated, which does not take the transparency parameters.
  if (
    (body.straight_alpha || body.tag_hint_transparent_background) &&
    !isV5Model(effectiveModel)
  ) {
    throw new Error(
      "straight_alpha and tag_hint_transparent_background are only supported for V5 models"
    );
  }

  const source = body.i2i ?? body.inpaint;

  const referenceImageMultiple = body.controlnet
    ? await Promise.all(
        body.controlnet.images.map(async (img) => {
          // Skip re-encoding if already encoded (style vibes are encoded when
          // registered).
          if (img.encoded !== undefined) return img.encoded;
          if (img.image === undefined) {
            throw new Error("controlnet image requires image or encoded");
          }
          return encodeVibe({
            image: img.image,
            information_extracted: img.info_extracted ?? 0.7,
            model: img.controlnet_model ?? model,
          });
        })
      )
    : undefined;

  const directorReferences = body.character_references
    ? {
        director_reference_images: body.character_references.map(
          (r) => r.image
        ),
        director_reference_descriptions: body.character_references.map((r) => ({
          caption: {
            base_caption: r.type ?? "character&style",
            char_captions: [],
          },
          legacy_uc: false,
        })),
        director_reference_strength_values: body.character_references.map((r) =>
          Number((r.strength ?? 1).toFixed(2))
        ),
        director_reference_secondary_strength_values:
          body.character_references.map((r) =>
            Number((1 - (r.fidelity ?? 1)).toFixed(2))
          ),
        director_reference_information_extracted: body.character_references.map(
          () => 1
        ),
      }
    : {};

  const v4Prompts = isV4Model(model)
    ? createV4Prompts(prompt, negativePrompt, body.characters)
    : { v4_prompt: undefined, v4_negative_prompt: undefined };

  const streamMode = getStreamMode(body);

  return {
    action: resolveAction(body),
    input: body.prompt,
    model: resolveApiModel(body),
    use_new_shared_trial: true,
    parameters: {
      params_version: isV5Model(effectiveModel) ? 4 : 3,
      legacy: false,
      legacy_v3_extend: false,
      deliberate_euler_ancestral_bug: false,
      prefer_brownian: true,
      autoSmea: false,
      sm: false,
      sm_dyn: false,
      add_original_image: false,
      dynamic_thresholding: false,
      legacy_uc: false,
      normalize_reference_strength_multiple: false,
      // Enable coordinates on the same condition as v4_prompt (let the AI
      // decide when no position is set).
      use_coords: (body.characters ?? []).some(
        (c) => (c.enabled ?? true) && c.position !== undefined
      ),
      width,
      height,
      steps: body.steps ?? 28,
      scale: body.scale ?? 5,
      sampler: body.sampler ?? "k_euler_ancestral",
      seed: body.seed ?? Math.floor(Math.random() * 1_000_000_000),
      n_samples: body.n_samples ?? 1,
      noise_schedule: body.noise_schedule ?? "karras",
      prompt: isV4Model(model) ? undefined : prompt,
      negative_prompt: negativePrompt,
      qualityToggle: body.quality ?? true,
      ucPreset: UC_PRESET_INT[body.uc_preset ?? "light"],
      cfg_rescale: body.cfg_rescale ?? 0,
      skip_cfg_above_sigma: body.variety_boost ? 58 : undefined,
      // Only sent when set: JSON.stringify drops undefined, and older models
      // reject the fields.
      straight_alpha: body.straight_alpha || undefined,
      tag_hint_transparent_background:
        body.tag_hint_transparent_background || undefined,
      image: source?.image,
      strength: body.i2i ? source?.strength : body.inpaint ? 0.7 : undefined,
      noise: body.i2i?.noise,
      mask: body.inpaint?.mask,
      inpaintImg2ImgStrength: source?.strength,
      img2img: source
        ? { color_correct: true, strength: source.strength }
        : undefined,
      extra_noise_seed: source?.seed,
      reference_image_multiple: referenceImageMultiple,
      reference_strength_multiple: body.controlnet?.images.map(
        (img) => img.strength ?? 0.6
      ),
      controlnet_strength: body.controlnet?.strength ?? 1,
      characterPrompts: buildCharacterPrompts(body.characters),
      image_format: body.image_format,
      ...(streamMode ? { stream: streamMode } : {}),
      ...v4Prompts,
      ...directorReferences,
    },
  };
}
