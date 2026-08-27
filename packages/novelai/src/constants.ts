export const NOVELAI_IMAGE_BASE = "https://image.novelai.net";
// /user/subscription currently lives on the image host; api.novelai.net
// returns 400.
export const NOVELAI_API_BASE = "https://image.novelai.net";
export const QUALITY_TAGS = ", very aesthetic, masterpiece, no text";

export const IMAGE_MODELS = [
  "nai-diffusion-5-full",
  "nai-diffusion-5-curated",
  "nai-diffusion-4-5-full",
  "nai-diffusion-4-5-curated",
  "nai-diffusion-4-full",
  "nai-diffusion-4-curated",
  "nai-diffusion-3",
  "nai-diffusion-3-furry",
] as const;

export const SIZE_PRESETS = {
  portrait: { width: 832, height: 1216 },
  landscape: { width: 1216, height: 832 },
  square: { width: 1024, height: 1024 },
  large_portrait: { width: 1024, height: 1536 },
  large_landscape: { width: 1536, height: 1024 },
} as const;

export const UC_PRESET_TEXT = {
  strong:
    ", lowres, artistic error, film grain, scan artifacts, worst quality, bad quality, jpeg artifacts, very displeasing, chromatic aberration, dithering, halftone, screentone, multiple views, logo, too many watermarks, negative space, blank page, ",
  light:
    ", lowres, artistic error, scan artifacts, worst quality, bad quality, jpeg artifacts, multiple views, very displeasing, too many watermarks, negative space, blank page, ",
  furry_focus:
    ", {worst quality}, distracting watermark, unfinished, bad quality, {widescreen}, upscale, {sequence}, {{grandfathered content}}, blurred foreground, chromatic aberration, sketch, everyone, [sketch background], simple, [flat colors], ych (character), outline, multiple scenes, [[horror (theme)]], comic, ",
  human_focus:
    ", lowres, artistic error, film grain, scan artifacts, worst quality, bad quality, jpeg artifacts, very displeasing, chromatic aberration, dithering, halftone, screentone, multiple views, logo, too many watermarks, negative space, blank page, @_@, mismatched pupils, glowing eyes, bad anatomy, ",
  none: "",
} as const;

export const UC_PRESET_INT = {
  strong: 0,
  light: 1,
  furry_focus: 2,
  human_focus: 3,
  none: 4,
} as const;

export const POSITION_PRESETS = [
  "A1",
  "A2",
  "A3",
  "A4",
  "A5",
  "B1",
  "B2",
  "B3",
  "B4",
  "B5",
  "C1",
  "C2",
  "C3",
  "C4",
  "C5",
  "D1",
  "D2",
  "D3",
  "D4",
  "D5",
  "E1",
  "E2",
  "E3",
  "E4",
  "E5",
] as const;

export const SAMPLERS = [
  "k_euler",
  "k_euler_ancestral",
  "k_dpmpp_2s_ancestral",
  "k_dpmpp_2m",
  "k_dpmpp_sde",
  "ddim_v3",
  "ddim",
  "plms",
  "k_lms",
  "k_dpm_2",
  "k_dpm_2_ancestral",
  "k_heun",
] as const;

export const NOISE_SCHEDULES = [
  "native",
  "karras",
  "exponential",
  "polyexponential",
] as const;

export const AREA_COEFFICIENT = 2.951823174884865e-6;
export const STEP_AREA_COEFFICIENT = 5.753298233447344e-7;
export const SMEA_MULTIPLIER = 1.2;
export const SMEA_DYN_MULTIPLIER = 1.4;
// V5 bills ~30% over the V4 curve. No official formula is published;
// ceil(v4BaseCost * 1.3) matches the measured 28-step per-image costs
// (11 / 26 / 39 for small / normal / large, where V4 pays 8 / 20 / 30).
export const V5_COST_MULTIPLIER = 1.3;
export const MAX_PER_IMAGE_ANLAS = 140;
export const LIGHTWEIGHT_OPUS_MAX_PIXELS = 1_048_576;
export const LIGHTWEIGHT_OPUS_MAX_STEPS = 28;
export const VIBE_EXTRA_ANLAS = 2;
export const CHARACTER_REFERENCE_EXTRA_ANLAS = 5;
// The first 4 vibes are free. Each vibe past the 4th costs VIBE_EXTRA_ANLAS.
export const VIBE_FREE_COUNT = 4;

/**
 * How many reference images one request may carry.
 *
 * A style and a single generation are bounded by the same request, so the
 * numbers live here rather than once per screen. They were duplicated before,
 * with the generate panel capped at half the style's figure, which silently
 * dropped the extra images on the way to a request.
 */
export const MAX_VIBE_REFERENCES = 16;
export const MAX_CHARACTER_REFERENCES = 6;

export const ZIP_LOCAL_FILE_HEADER_SIGNATURE = 0x04034b50;
export const ZIP_CENTRAL_DIRECTORY_SIGNATURE = 0x02014b50;
export const ZIP_END_OF_CENTRAL_DIRECTORY_SIGNATURE = 0x06054b50;
