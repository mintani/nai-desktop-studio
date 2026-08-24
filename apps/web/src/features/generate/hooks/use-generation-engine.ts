"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";

import { useT } from "@/i18n/provider";

import { ApiError } from "@/lib/api-client";

import { resolveReferences } from "@/features/reference-library/lib/api";
import { referencesQueryKey } from "@/features/reference-library/hooks/queries";
import { useSettings } from "@/features/settings/hooks/queries";

import { aspectOfSize } from "../constants";
import { encodeVibe, generateImages, generateImageStream } from "../lib/api";
import {
  buildGenerateRequest,
  supportsReferenceImages,
  supportsVibes,
  type EncodedVibe,
} from "../lib/build-request";
import type { GenerationJob } from "../lib/compose";
import type { FormState } from "../types/generate";
import type { GeneratedImage, GenerationSlot } from "../types/image";

type EngineState = {
  slots: GenerationSlot[];
  isGenerating: boolean;
  /** Number of finished images. Used for the progress display. */
  done: number;
  total: number;
};

const IDLE: EngineState = { slots: [], isGenerating: false, done: 0, total: 0 };

type Options = {
  /** Called each time one image is saved. Used to update the library cache. */
  onImageSaved: (image: GeneratedImage) => void;
};

/**
 * The generation runner. Two modes, chosen in settings:
 *
 * - queue: one request per image, so slots fill in arrival order, progress is
 *   visible, and stopping midway keeps the images already finished. On Opus each
 *   small single-image request stays free.
 * - alternate: the whole batch in one request. Fewer round trips, but nothing
 *   appears until every image is done and only the first gets the Opus discount.
 */
export function useGenerationEngine({ onImageSaved }: Options) {
  const t = useT();
  const queryClient = useQueryClient();
  const { data: settings } = useSettings();
  const mode = settings?.generationMode ?? "queue";
  const [state, setState] = useState<EngineState>(IDLE);
  const abortRef = useRef<AbortController | null>(null);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setState((current) => ({ ...current, isGenerating: false }));
  }, []);

  /** Drops a deleted image from the view without waiting for a refetch. */
  const removeImage = useCallback((id: string) => {
    setState((current) => {
      const slots = current.slots.filter((slot) => slot.image?.id !== id);
      if (slots.length === current.slots.length) return current;
      return {
        ...current,
        slots,
        done: Math.min(current.done, slots.length),
        total: Math.min(current.total, slots.length),
      };
    });
  }, []);

  /** Clears the viewer, e.g. after the whole history is deleted. */
  const reset = useCallback(() => setState(IDLE), []);

  const generate = useCallback(
    async (jobs: GenerationJob[]) => {
      const [firstJob] = jobs;
      if (abortRef.current || !firstJob) return;

      // One batch id for the whole run, so a batch covering several scenes
      // lands in the history as one group in the order it was generated.
      const batchId = crypto.randomUUID();
      const total = jobs.reduce((sum, job) => sum + job.form.nSamples, 0);
      const controller = new AbortController();
      abortRef.current = controller;

      // Scene-major: every image of a scene before the next scene starts, so
      // what appears on screen follows the order the scenes were picked in.
      const plan = jobs.flatMap((job) =>
        Array.from({ length: job.form.nSamples }, () => job)
      );

      setState({
        slots: plan.map((job, index) => ({
          key: `${batchId}:${index}`,
          image: null,
          previewDataUrl: null,
          aspect: aspectOfSize(job.form.size),
        })),
        isGenerating: true,
        done: 0,
        total,
      });

      const slotKey = (index: number) => `${batchId}:${index}`;

      function patchSlot(key: string, patch: Partial<GenerationSlot>) {
        setState((current) => ({
          ...current,
          slots: current.slots.map((slot) =>
            slot.key === key ? { ...slot, ...patch } : slot
          ),
        }));
      }

      try {
        // Encode vibes once at the start of the batch. Re-sending per image
        // costs 2 Anlas each time. Every job shares the same reference images,
        // so one encode covers the whole run.
        const first = firstJob.form;
        let encodedVibes: EncodedVibe[] = [];
        if (
          first.referenceMode === "vibe" &&
          first.vibes.length > 0 &&
          supportsVibes(first.model)
        ) {
          encodedVibes = await Promise.all(
            first.vibes.map(async (vibe) => ({
              encoded: await encodeVibe(
                vibe.imageBase64,
                vibe.infoExtracted,
                first.model
              ),
              strength: vibe.strength,
            }))
          );
        }

        // Library entries are resolved by the server, which already holds the
        // encode for anything used before. Only a first-time vibe spends the
        // 2 Anlas here; everything else is a file read.
        // On a model with no reference support (V5), skip resolving too:
        // the server encodes first-time vibes during resolve, and that spend
        // would buy images nothing here.
        let libraryForm = first;
        if (
          first.libraryReferenceIds.length > 0 &&
          supportsReferenceImages(first.model)
        ) {
          try {
            const resolved = await resolveReferences(first.libraryReferenceIds);
            const dropped = first.libraryReferenceIds.length - resolved.length;
            if (dropped > 0) {
              toast.warning(t("referenceLibrary.dropped", { count: dropped }));
            }
            if (first.referenceMode === "vibe") {
              encodedVibes = [
                ...encodedVibes,
                ...resolved
                  .filter((entry) => entry.kind === "vibe")
                  .map((entry) => ({
                    encoded: entry.encoded,
                    strength: entry.strength,
                  })),
              ];
            } else {
              libraryForm = {
                ...first,
                references: [
                  ...first.references,
                  ...resolved
                    .filter((entry) => entry.kind === "reference")
                    .map((entry) => ({
                      id: entry.id,
                      previewUrl: "",
                      imageBase64: entry.image,
                      referenceType:
                        entry.referenceType as (typeof first.references)[number]["referenceType"],
                      strength: entry.strength,
                      fidelity: entry.fidelity,
                    })),
                ],
              };
            }
            // A first-time encode flips the badge in the picker.
            void queryClient.invalidateQueries({
              queryKey: referencesQueryKey,
            });
          } catch {
            toast.error(t("referenceLibrary.resolveError"));
          }
        }

        // The resolved precise references belong to the run, not to one scene,
        // so each job's form picks them up as it goes out.
        const libraryReferences = libraryForm.references;
        const withLibrary = (form: FormState): FormState =>
          libraryReferences === first.references
            ? form
            : { ...form, references: libraryReferences };

        let index = 0;
        for (const job of jobs) {
          if (controller.signal.aborted) break;
          const count = job.form.nSamples;

          if (mode === "alternate") {
            // One request covers this scene's whole set. A run of several
            // scenes is still several requests: a request carries one prompt.
            const body = buildGenerateRequest(withLibrary(job.form), {
              batchId,
              index,
              encodedVibes,
              nSamples: count,
            });
            const { images } = await generateImages(body, controller.signal);
            images.forEach((image, offset) => {
              patchSlot(slotKey(index + offset), {
                image,
                previewDataUrl: null,
              });
              onImageSaved(image);
            });
            setState((current) => ({
              ...current,
              done: current.done + images.length,
            }));
            index += count;
            continue;
          }

          for (let n = 0; n < count; n++) {
            if (controller.signal.aborted) break;
            const slot = index++;
            const body = buildGenerateRequest(withLibrary(job.form), {
              batchId,
              index: slot,
              encodedVibes,
            });

            for await (const event of generateImageStream(
              body,
              controller.signal
            )) {
              if (event.type === "preview") {
                patchSlot(slotKey(slot), {
                  previewDataUrl: `data:image/png;base64,${event.image}`,
                });
              } else if (event.type === "image") {
                patchSlot(slotKey(slot), {
                  image: event.image,
                  previewDataUrl: null,
                });
                setState((current) => ({ ...current, done: current.done + 1 }));
                onImageSaved(event.image);
              } else if (event.type === "error") {
                throw new Error(event.message);
              }
            }
          }
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          const message =
            error instanceof ApiError && error.isApiKeyRequired
              ? t("generate.error.noApiKey")
              : error instanceof Error
                ? error.message
                : t("generate.error.failed");
          toast.error(message);
        }
      } finally {
        abortRef.current = null;
        setState((current) => ({ ...current, isGenerating: false }));
      }
    },
    [mode, onImageSaved, queryClient, t]
  );

  return { ...state, generate, cancel, removeImage, reset };
}
