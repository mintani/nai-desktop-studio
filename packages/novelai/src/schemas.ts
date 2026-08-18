import { z } from "zod";
import {
  IMAGE_MODELS,
  NOISE_SCHEDULES,
  POSITION_PRESETS,
  SAMPLERS,
} from "./constants";

export const sizeSchema = z
  .union([
    z.enum([
      "portrait",
      "landscape",
      "square",
      "large_portrait",
      "large_landscape",
    ]),
    z.object({
      width: z.number().int().min(64).max(1600),
      height: z.number().int().min(64).max(1600),
    }),
  ])
  .optional();

export const characterSchema = z.object({
  prompt: z.string().min(1),
  negative_prompt: z.string().optional(),
  position: z
    .union([
      z.enum(POSITION_PRESETS),
      z.object({
        x: z.number().min(0).max(1),
        y: z.number().min(0).max(1),
      }),
    ])
    .optional(),
  enabled: z.boolean().optional(),
});

export const characterReferenceSchema = z.object({
  image: z.string().min(1),
  type: z.enum(["character", "style", "character&style"]).optional(),
  fidelity: z.number().min(0).max(1).optional(),
  strength: z.number().min(0).max(1).optional(),
});

export const controlNetImageSchema = z
  .object({
    // Raw image base64. When set, encode with encodeVibe on each generation.
    image: z.string().min(1).optional(),
    // Pre-encoded vibe (encodeVibe output). When set, use as-is without
    // re-encoding.
    encoded: z.string().min(1).optional(),
    info_extracted: z.number().min(0.01).max(1).optional(),
    strength: z.number().min(0.01).max(1).optional(),
    controlnet_model: z.enum(IMAGE_MODELS).optional(),
  })
  .refine((v) => v.image !== undefined || v.encoded !== undefined, {
    message: "Either image or encoded is required",
  });

export const generateImageSchema = z.object({
  prompt: z.string().min(1),
  model: z.enum(IMAGE_MODELS).optional(),
  size: sizeSchema,
  negative_prompt: z.string().optional(),
  quality: z.boolean().optional(),
  uc_preset: z
    .enum(["strong", "light", "furry_focus", "human_focus", "none"])
    .optional(),
  steps: z.number().int().min(1).max(50).optional(),
  scale: z.number().min(0).max(10).optional(),
  sampler: z.enum(SAMPLERS).optional(),
  noise_schedule: z.enum(NOISE_SCHEDULES).optional(),
  seed: z.number().int().optional(),
  n_samples: z.number().int().min(1).max(8).optional(),
  cfg_rescale: z.number().min(0).max(1).optional(),
  variety_boost: z.boolean().optional(),
  i2i: z
    .object({
      image: z.string().min(1),
      strength: z.number().min(0.01).max(0.99).optional(),
      noise: z.number().min(0).max(0.99).optional(),
      seed: z.number().int().optional(),
    })
    .optional(),
  inpaint: z
    .object({
      image: z.string().min(1),
      mask: z.string().min(1),
      strength: z.number().min(0.01).max(1).optional(),
      seed: z.number().int().optional(),
    })
    .optional(),
  controlnet: z
    .object({
      images: z.array(controlNetImageSchema).min(1),
      strength: z.number().min(0).max(1).optional(),
    })
    .optional(),
  character_references: z.array(characterReferenceSchema).optional(),
  characters: z.array(characterSchema).optional(),
  image_format: z.enum(["png", "webp"]).optional(),
});

export const generateImageStreamSchema = generateImageSchema.extend({
  stream: z.literal("sse").optional(),
});

export const estimateAnlasSchema = z.object({
  model: z.enum(IMAGE_MODELS).optional(),
  size: sizeSchema,
  steps: z.number().int().min(1).max(50).optional(),
  n_samples: z.number().int().min(1).max(8).optional(),
  sm: z.boolean().optional(),
  sm_dyn: z.boolean().optional(),
  is_opus: z.boolean().optional(),
  i2i_strength: z.number().min(0.01).max(1).optional(),
  inpaint_strength: z.number().min(0.01).max(1).optional(),
  character_reference_count: z.number().int().min(0).optional(),
  vibe_reference_count: z.number().int().min(0).optional(),
  uncached_vibe_count: z.number().int().min(0).optional(),
});

export const encodeVibeSchema = z.object({
  image: z.string().min(1),
  information_extracted: z.number().min(0.000_001).max(1),
  model: z.enum(IMAGE_MODELS),
});

export type GenerateImageBody = z.infer<typeof generateImageSchema>;
export type GenerateImageStreamBody = z.infer<typeof generateImageStreamSchema>;
export type EstimateAnlasBody = z.infer<typeof estimateAnlasSchema>;
export type EncodeVibeBody = z.infer<typeof encodeVibeSchema>;
export type ImageModel = (typeof IMAGE_MODELS)[number];
export type CharacterPosition = NonNullable<
  NonNullable<GenerateImageBody["characters"]>[number]["position"]
>;
export type UCPreset =
  | "strong"
  | "light"
  | "furry_focus"
  | "human_focus"
  | "none";

/**
 * Whether this is a V4-family model (only V4 supports characters /
 * char_captions).
 */
export function isV4Model(model: ImageModel): boolean {
  return model.startsWith("nai-diffusion-4");
}

/**
 * Whether this is a V4.5-family model (only V4.5 supports precise reference,
 * director_reference_*).
 */
export function isV45Model(model: ImageModel): boolean {
  return model.startsWith("nai-diffusion-4-5");
}
