"use client";

import { useQuery } from "@tanstack/react-query";
import { useDeferredValue, useMemo } from "react";

import { useReferences } from "@/features/reference-library/hooks/queries";
import { useSettings } from "@/features/settings/hooks/queries";
import { useT } from "@/i18n/provider";

import { estimateAnlas } from "../lib/api";
import { supportsReferences } from "../lib/build-request";
import type { FormState } from "../types/generate";

/**
 * Anlas estimate shown on the generate button. The formula lives on the server
 * (packages/novelai), so here we just pass the conditions and receive the
 * result. Thinned with deferred so it isn't hit on every keystroke.
 */
export function useAnlasEstimate(form: FormState, imageCount?: number) {
  const t = useT();
  const { data: settings } = useSettings();
  const { references } = useReferences();
  const isOpus = settings?.plan === "opus";

  // Library entries count towards the vibe total, but only the ones with no
  // stored encode still cost the 2 Anlas — that is the whole point of saving
  // them, so the figure on the button has to show it.
  const picked = form.libraryReferenceIds.flatMap((id) => {
    const found = references.find((entry) => entry.id === id);
    return found && found.kind === form.referenceMode ? [found] : [];
  });
  const libraryVibes = form.referenceMode === "vibe" ? picked.length : 0;
  const libraryUncached =
    form.referenceMode === "vibe"
      ? picked.filter((entry) => entry.encodedAt === null).length
      : 0;
  const libraryReferences =
    form.referenceMode === "reference" ? picked.length : 0;
  const mode = settings?.generationMode ?? "queue";

  // useDeferredValue compares by reference identity, so passing a new object
  // every render means the deferred update never settles and re-renders never
  // stop. Always pass a memoized value.
  const params = useMemo(
    () => ({
      model: form.model,
      size: form.size,
      steps: form.steps,
      // A batch run covers several scenes, so the number of images is not
      // form.nSamples but scenes x nSamples. The caller knows the scene count.
      nSamples: imageCount ?? form.nSamples,
      vibeCount:
        form.referenceMode === "vibe" ? form.vibes.length + libraryVibes : 0,
      uncachedVibeCount:
        form.referenceMode === "vibe" ? form.vibes.length + libraryUncached : 0,
      referenceCount:
        form.referenceMode === "reference" && supportsReferences(form.model)
          ? form.references.length + libraryReferences
          : 0,
      i2iStrength: form.i2i?.strength ?? null,
      isOpus,
      mode,
    }),
    [
      form.model,
      form.size,
      form.steps,
      form.nSamples,
      imageCount,
      form.referenceMode,
      form.vibes.length,
      form.references.length,
      libraryVibes,
      libraryUncached,
      libraryReferences,
      form.i2i?.strength,
      isOpus,
      mode,
    ]
  );

  const deferred = useDeferredValue(params);

  const query = useQuery({
    queryKey: ["novelai", "anlas-estimate", deferred],
    placeholderData: (previous) => previous,
    queryFn: () =>
      estimateAnlas({
        model: deferred.model,
        size: deferred.size,
        steps: deferred.steps,
        // Queue mode sends one image per request, so the server's per-request
        // figure is the 1-sample one; the batch total is derived below.
        n_samples: deferred.mode === "alternate" ? deferred.nSamples : 1,
        character_reference_count: deferred.referenceCount,
        vibe_reference_count: deferred.vibeCount,
        // An image dropped into the panel is encoded once per batch, so it is
        // always uncached. A library entry that already has its encode is not.
        uncached_vibe_count: deferred.uncachedVibeCount,
        // Opus makes small generations free, which changes the number shown on
        // the generate button.
        is_opus: deferred.isOpus,
        ...(deferred.i2iStrength === null
          ? {}
          : { i2i_strength: deferred.i2iStrength }),
      }),
  });

  // In queue mode each image is its own request, so the per-request cost repeats
  // for every image. Vibe encoding is charged once for the batch, not per image.
  const total = query.data
    ? deferred.mode === "alternate"
      ? query.data.total_anlas
      : (query.data.base_anlas +
          query.data.character_reference_anlas +
          query.data.vibe_reference_anlas) *
          deferred.nSamples +
        query.data.vibe_encoding_anlas
    : null;

  // "0 Anlas" reads too much like a real cost at a glance, so say it is free.
  const anlasText =
    total === null
      ? query.isError
        ? "--"
        : null
      : total === 0
        ? t("generate.free")
        : t("unit.anlas", { count: total.toLocaleString() });

  return { anlasText, estimate: query.data ?? null };
}
