import {
  QUALITY_TAGS,
  UC_PRESET_TEXT,
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

export const QUALITY_GROUP = joinTags([QUALITY_TAGS]);
export const NEGATIVE_GROUP = joinTags([UC_PRESET_TEXT.light]);

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
