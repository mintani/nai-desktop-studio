import type { CharacterGender } from "@/features/characters/lib/template";
import type {
  MODEL_OPTIONS,
  NOISE_SCHEDULE_OPTIONS,
  SAMPLER_OPTIONS,
  SIZE_OPTIONS,
  UC_PRESET_OPTIONS,
} from "../constants";
import type {
  AdhocReference,
  AdhocVibe,
  I2iSource,
  ReferenceMode,
} from "./reference";

export type ImageModel = (typeof MODEL_OPTIONS)[number]["value"];
export type SizePreset = (typeof SIZE_OPTIONS)[number]["value"];
export type Sampler = (typeof SAMPLER_OPTIONS)[number];
export type NoiseSchedule = (typeof NOISE_SCHEDULE_OPTIONS)[number];
export type UcPreset = (typeof UC_PRESET_OPTIONS)[number]["value"];

/**
 * A free placement on the frame, in 0-1 fractions of its width and height.
 * Only V5 models take it as-is; older models snap it to the 5x5 grid.
 */
export type PlacementPoint = { x: number; y: number };

export type CharacterData = {
  prompt: string;
  negativePrompt: string;
  /**
   * A1..E5 placement preset or a free point (V5). null sends no position and
   * lets NovelAI decide.
   */
  position: string | PlacementPoint | null;
  /** Prepended to this character's caption at send time. Null adds nothing. */
  gender: CharacterGender | null;
  enabled: boolean;
};

/** The entire generation-form state. The workspace holds it as one state. */
export type FormState = {
  prompt: string;
  negativePrompt: string;
  model: ImageModel;
  size: SizePreset;
  sampler: Sampler;
  noiseSchedule: NoiseSchedule;
  ucPreset: UcPreset;
  steps: number;
  scale: number;
  cfgRescale: number;
  /** An empty string means a random seed. */
  seed: string;
  nSamples: number;
  quality: boolean;
  varietyBoost: boolean;
  /** V5-only transparent output. Ignored (not sent) on earlier models. */
  transparentBackground: boolean;
  characters: CharacterData[];
  i2i: I2iSource | null;
  referenceMode: ReferenceMode;
  vibes: AdhocVibe[];
  references: AdhocReference[];
  /**
   * Saved reference entries picked for this run. Held as ids: the image and the
   * encode stay on the server, so a run carries only the choice.
   */
  libraryReferenceIds: string[];
};

/**
 * Body sent to the server's `/novelai/generate`. Corresponds to
 * generateImageSchema in packages/novelai.
 */
export type GenerateRequestBody = {
  prompt: string;
  negative_prompt?: string;
  model: ImageModel;
  size: SizePreset;
  sampler: Sampler;
  noise_schedule: NoiseSchedule;
  uc_preset: UcPreset;
  steps: number;
  scale: number;
  cfg_rescale: number;
  seed?: number;
  quality: boolean;
  variety_boost: boolean;
  /** V5-only: emit a straight alpha channel. Sent together with the hint. */
  straight_alpha?: boolean;
  tag_hint_transparent_background?: boolean;
  image_format: "png";
  batch_id: string;
  index: number;
  /** Only sent in alternate mode; queue mode leaves it at the default of 1. */
  n_samples?: number;
  characters?: {
    prompt: string;
    negative_prompt?: string;
    position?: string | PlacementPoint;
  }[];
  i2i?: {
    image: string;
    strength: number;
    noise: number;
  };
  controlnet?: {
    images: {
      image?: string;
      encoded?: string;
      info_extracted?: number;
      strength?: number;
    }[];
  };
  character_references?: {
    image: string;
    type: string;
    strength: number;
    fidelity: number;
  }[];
};

export type AnlasEstimate = {
  total_anlas: number;
  per_image_anlas: number;
  requested_samples: number;
  billable_samples: number;
  /** Cost of the images themselves, after any Opus discount. */
  base_anlas: number;
  character_reference_anlas: number;
  /** Charged once per batch, not per image. */
  vibe_encoding_anlas: number;
  vibe_reference_anlas: number;
  opus_discount_applied: boolean;
};

/**
 * What the panel is set up for. "normal" is a prompt typed by hand; "batch"
 * builds the prompt from a saved situation, characters and style.
 */
export type GenerationMode = "normal" | "batch";

/** Tile width for the grid view. */
export type TileSize = "s" | "m" | "l";

/**
 * How results are shown. Toggles between the one-at-a-time carousel and the grid
 * list.
 */
export type ViewMode = "single" | "grid";
