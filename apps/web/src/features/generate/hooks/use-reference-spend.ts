"use client";

import { VIBE_FREE_COUNT } from "@nai-desktop-studio/novelai/constants";

import { useReferences } from "@/features/reference-library/hooks/queries";

import { pickedLibraryReferences } from "../lib/library-references";
import type { FormState } from "../types/generate";

/**
 * Whether this run will spend Anlas on its reference images.
 *
 * Worked out from the panel rather than from the Anlas estimate. The estimate
 * is deferred and then fetched, so in the moment after an image is dropped in
 * it still describes the run before it — and a stale "costs nothing" would
 * spend the money without asking. What the panel holds is always current.
 */
export function useReferenceSpend(form: FormState): boolean {
  const { references } = useReferences();
  const picked = pickedLibraryReferences(form, references);

  // Precise references are charged for every image, every run. Nothing about
  // them is ever free.
  if (form.referenceMode === "reference") {
    return form.references.length + picked.length > 0;
  }

  const vibeCount = form.vibes.length + picked.length;
  if (vibeCount === 0) return false;

  // An image dropped straight into the panel is encoded again on every run;
  // one from the library keeps its encode after the first time.
  const uncached =
    form.vibes.length +
    picked.filter((entry) => entry.encodedAt === null).length;

  return uncached > 0 || vibeCount > VIBE_FREE_COUNT;
}
