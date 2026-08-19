import type { FormState } from "./types/generate";

export const MODEL_OPTIONS = [
  { value: "nai-diffusion-4-5-full", label: "V4.5 Full" },
  { value: "nai-diffusion-4-5-curated", label: "V4.5 Curated" },
  { value: "nai-diffusion-4-full", label: "V4 Full" },
  { value: "nai-diffusion-4-curated", label: "V4 Curated" },
  { value: "nai-diffusion-3", label: "V3" },
  { value: "nai-diffusion-3-furry", label: "V3 Furry" },
] as const;

export const SAMPLER_OPTIONS = [
  "k_euler",
  "k_euler_ancestral",
  "k_dpmpp_2s_ancestral",
  "k_dpmpp_2m",
  "k_dpmpp_sde",
  "ddim_v3",
] as const;

export const NOISE_SCHEDULE_OPTIONS = [
  "native",
  "karras",
  "exponential",
  "polyexponential",
] as const;

export const SIZE_OPTIONS = [
  { value: "portrait", labelKey: "generate.size.portrait", w: 832, h: 1216 },
  { value: "landscape", labelKey: "generate.size.landscape", w: 1216, h: 832 },
  { value: "square", labelKey: "generate.size.square", w: 1024, h: 1024 },
  {
    value: "large_portrait",
    labelKey: "generate.size.largePortrait",
    w: 1024,
    h: 1536,
  },
  {
    value: "large_landscape",
    labelKey: "generate.size.largeLandscape",
    w: 1536,
    h: 1024,
  },
] as const;

/** width / height of a size preset. Used wherever the frame's shape matters. */
export function aspectOfSize(size: string): number {
  const option = SIZE_OPTIONS.find((item) => item.value === size);
  return option ? option.w / option.h : 1;
}

/** Shown as their own buttons. Everything else hides behind "Other". */
export const PRIMARY_SIZES = ["portrait", "landscape"] as const;

export const UC_PRESET_OPTIONS = [
  { value: "light", labelKey: "generate.uc.light" },
  { value: "strong", labelKey: "generate.uc.strong" },
  { value: "human_focus", labelKey: "generate.uc.humanFocus" },
  { value: "furry_focus", labelKey: "generate.uc.furryFocus" },
  { value: "none", labelKey: "generate.uc.none" },
] as const;

export const N_SAMPLES_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8] as const;

/** Only V4-series models can send characters[]. */
export const SUPPORTS_CHARACTERS_PREFIX = "nai-diffusion-4";
/** Only V4.5-series models can use precise reference (director reference). */
export const SUPPORTS_REFERENCE_PREFIX = "nai-diffusion-4-5";

export const TAG_SEARCH_LIMIT = 15;

export const POSITION_GRID = [
  ["A1", "B1", "C1", "D1", "E1"],
  ["A2", "B2", "C2", "D2", "E2"],
  ["A3", "B3", "C3", "D3", "E3"],
  ["A4", "B4", "C4", "D4", "E4"],
  ["A5", "B5", "C5", "D5", "E5"],
] as const;

export const DEFAULT_CHARACTER = {
  prompt: "",
  negativePrompt: "",
  // Default to no position. Sending coordinates turns on use_coords, which tends
  // to lock the framing.
  position: null,
  gender: null,
  enabled: true,
} as const;

export const INITIAL_FORM: FormState = {
  prompt: "",
  negativePrompt: "",
  model: "nai-diffusion-4-5-full",
  size: "portrait",
  sampler: "k_euler_ancestral",
  noiseSchedule: "karras",
  ucPreset: "light",
  steps: 28,
  scale: 5,
  cfgRescale: 0,
  seed: "",
  nSamples: 1,
  quality: true,
  varietyBoost: false,
  characters: [],
  i2i: null,
  referenceMode: "vibe",
  vibes: [],
  references: [],
  libraryReferenceIds: [],
};

/**
 * Danbooru tag category colors.
 * 0: General (blue) / 1: Artist (red) / 3: Copyright (purple) / 4: Character
 * (green) / 5: Meta (orange)
 */
export const CATEGORY_COLORS: Record<number, string> = {
  0: "text-sky-400",
  1: "text-rose-400",
  3: "text-violet-400",
  4: "text-emerald-400",
  5: "text-amber-400",
  7: "text-sky-400",
  12: "text-sky-400",
  14: "text-sky-400",
};

export const CATEGORY_LABELS: Record<number, string> = {
  0: "General",
  1: "Artist",
  3: "Copyright",
  4: "Character",
  5: "Meta",
  7: "Species",
  12: "Species",
  14: "Meta",
};

/**
 * The panel sections that can be set to start expanded.
 *
 * The prompt, size and count fields are not here: they are always visible, and
 * a setting for something that cannot be closed would be a switch attached to
 * nothing.
 */
export const PANEL_SECTIONS = [
  { id: "template", labelKey: "generate.section.template" },
  { id: "characters", labelKey: "generate.section.characters" },
  { id: "reference", labelKey: "generate.section.reference" },
  { id: "advanced", labelKey: "generate.section.advanced" },
] as const;

export type PanelSectionId = (typeof PANEL_SECTIONS)[number]["id"];
