import {
  QUALITY_TAGS,
  UC_PRESET_TEXT,
  V5_UC_PRESET_TEXT,
} from "@nai-desktop-studio/novelai/constants";

import type { StylePromptPosition } from "../types/style";

/** Splits on commas, trims, drops empties, rejoins — the same rule used everywhere else. */
function joinTags(parts: string[]): string {
  return parts
    .flatMap((part) => part.split(","))
    .map((tag) => tag.trim())
    .filter(Boolean)
    .join(", ");
}

/**
 * The model's quality tags as a clean group. Quality tags differ per model, so
 * the group is looked up rather than fixed; an unknown model falls back to the
 * package default (V4.5 Full).
 */
export function qualityGroup(model: string): string {
  const tags =
    QUALITY_TAGS[model as keyof typeof QUALITY_TAGS] ??
    QUALITY_TAGS["nai-diffusion-4-5-full"];
  return joinTags([tags]);
}

/** The model's Light UC preset as a clean group. V5 rewrote it. */
export function negativeGroup(model: string): string {
  const presets = model.startsWith("nai-diffusion-5")
    ? V5_UC_PRESET_TEXT
    : UC_PRESET_TEXT;
  return joinTags([presets.light]);
}

/**
 * Builds the final prompt with the quality block up front and the style tag at
 * the requested position. An unknown position falls through to after_quality so
 * the result is never empty.
 *
 * - start:         `style, group, base`
 * - end:           `group, base, style`
 * - after_quality: `group, style, base`
 */
export function assembleStyledPrompt(
  base: string,
  group: string,
  styleTag: string,
  position: StylePromptPosition
): string {
  switch (position) {
    case "start":
      return joinTags([styleTag, group, base]);
    case "end":
      return joinTags([group, base, styleTag]);
    default:
      return joinTags([group, styleTag, base]);
  }
}
