import {
  CHARACTER_REFERENCE_EXTRA_ANLAS,
  VIBE_EXTRA_ANLAS,
  VIBE_FREE_COUNT,
} from "@nai-desktop-studio/novelai/constants";

import type { ReferenceCost } from "../components/anlas-confirm-dialog";
import { supportsReferences, supportsVibes } from "./build-request";

export type SpendInput = {
  model: string;
  referenceMode: "vibe" | "reference";
  /** Every vibe the run sends: panel + style + library. */
  vibeCount: number;
  /** The subset of those without a stored encode anywhere. */
  uncachedVibeCount: number;
  preciseCount: number;
  /** Images in the whole run (scenes × samples). */
  imageCount: number;
};

/**
 * What this run spends on reference images, computed from what actually goes
 * out rather than from the deferred estimate.
 *
 * Encoding is charged once per uncached vibe for the run; the surcharge past
 * the free four and every precise reference are charged per image. A model
 * that cannot take vibes (or precise references) sends none, so it spends
 * nothing on them.
 */
export function assessReferenceSpend(input: SpendInput): ReferenceCost {
  const vibesGoOut =
    input.referenceMode === "vibe" && supportsVibes(input.model);
  const preciseGoesOut =
    input.referenceMode === "reference" && supportsReferences(input.model);

  const encoding = vibesGoOut ? input.uncachedVibeCount * VIBE_EXTRA_ANLAS : 0;
  const vibeSurcharge = vibesGoOut
    ? Math.max(input.vibeCount - VIBE_FREE_COUNT, 0) *
      VIBE_EXTRA_ANLAS *
      input.imageCount
    : 0;
  const precise = preciseGoesOut
    ? input.preciseCount * CHARACTER_REFERENCE_EXTRA_ANLAS * input.imageCount
    : 0;

  return {
    encoding,
    vibeSurcharge,
    precise,
    total: encoding + vibeSurcharge + precise,
  };
}
