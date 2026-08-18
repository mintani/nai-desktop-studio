import {
  IMAGE_MODELS,
  NOISE_SCHEDULES,
  SAMPLERS,
} from "@nai-desktop-studio/novelai/constants";

export type StyleModel = (typeof IMAGE_MODELS)[number];
export type StyleSampler = (typeof SAMPLERS)[number];
export type StyleNoiseSchedule = (typeof NOISE_SCHEDULES)[number];

/** Where the style tag lands relative to the quality-tag block. */
export const STYLE_PROMPT_POSITIONS = [
  "start",
  "after_quality",
  "end",
] as const;
export type StylePromptPosition = (typeof STYLE_PROMPT_POSITIONS)[number];

export const STYLE_PROMPT_POSITION_LABEL_KEYS: Record<
  StylePromptPosition,
  string
> = {
  start: "style.position.start",
  after_quality: "style.position.afterQuality",
  end: "style.position.end",
};

/**
 * Generation parameters a style may override. null means "leave the current
 * setting alone", so a style can carry only the parts that define its look.
 */
export type StyleGenerationParams = {
  model: StyleModel | null;
  steps: number | null;
  scale: number | null;
  cfgRescale: number | null;
  varietyBoost: boolean | null;
  sampler: StyleSampler | null;
  noiseSchedule: StyleNoiseSchedule | null;
};

export const MAX_STYLE_VIBES = 16;
export const MAX_STYLE_REFERENCES = 6;

export const STYLE_REFERENCE_TYPES = [
  "character",
  "style",
  "character&style",
] as const;
export type StyleReferenceType = (typeof STYLE_REFERENCE_TYPES)[number];

/** Precise reference. Sent as character_references; cannot be combined with vibes. */
export type StyleReference = {
  id: string;
  /** Asset path served by the local server. */
  imagePath: string;
  referenceType: StyleReferenceType;
  strength: number;
  /** 1 - fidelity becomes the secondary strength at generation time. */
  fidelity: number;
  sortOrder: number;
};

/** Vibe transfer image. Sent as reference_image_multiple. */
export type StyleVibe = {
  id: string;
  imagePath: string;
  strength: number;
  /** Changing this forces a re-encode on the next run, which costs Anlas. */
  infoExtracted: number;
  sortOrder: number;
};

export type Style = {
  id: string;
  name: string;
  groupName: string | null;
  samplePath: string | null;
  styleTag: string;
  negativeTag: string;
  promptPosition: StylePromptPosition;
  negativePosition: StylePromptPosition;
  vibes: StyleVibe[];
  references: StyleReference[];
  createdAt: string;
  updatedAt: string;
} & StyleGenerationParams;

export function createEmptyStyle(name: string): Style {
  const now = new Date().toISOString();

  return {
    id: crypto.randomUUID(),
    name,
    groupName: null,
    samplePath: null,
    styleTag: "",
    negativeTag: "",
    promptPosition: "after_quality",
    negativePosition: "after_quality",
    vibes: [],
    references: [],
    model: null,
    steps: null,
    scale: null,
    cfgRescale: null,
    varietyBoost: null,
    sampler: null,
    noiseSchedule: null,
    createdAt: now,
    updatedAt: now,
  };
}
