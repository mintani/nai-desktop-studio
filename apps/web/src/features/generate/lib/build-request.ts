import {
  SUPPORTS_CHARACTERS_PREFIX,
  SUPPORTS_REFERENCE_PREFIX,
} from "../constants";
import type { FormState, GenerateRequestBody } from "../types/generate";

/**
 * An encoded vibe. Built once at the start of the batch and reused for every
 * image.
 */
export type EncodedVibe = { encoded: string; strength: number };

export function supportsCharacters(model: string) {
  return model.startsWith(SUPPORTS_CHARACTERS_PREFIX);
}

export function supportsReferences(model: string) {
  return model.startsWith(SUPPORTS_REFERENCE_PREFIX);
}

/**
 * The caption NovelAI receives for one character.
 *
 * The subject word goes first, the way the official app writes it. V4 reads
 * each character caption on its own, and a caption that is only attributes has
 * no subject to hang them on — with several characters they end up on one body.
 */
function characterCaption(gender: string | null, prompt: string) {
  return [gender ?? "", prompt]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(", ");
}

function parseSeed(value: string) {
  const trimmed = value.trim();
  // An empty field means "random". Number("") is 0, so without this guard we
  // would send seed 0 as a fixed value, and the saved metadata would record seed
  // 0 and lose reproducibility.
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : null;
}

type BuildOptions = {
  batchId: string;
  index: number;
  encodedVibes: EncodedVibe[];
  /** Set only in alternate mode, where one request covers the whole batch. */
  nSamples?: number;
};

/**
 * Converts the form state into a request for a single image. For multiple
 * images, call with a different index each time. When the seed is fixed, it is
 * offset by index so the same batch still produces different pictures.
 */
export function buildGenerateRequest(
  form: FormState,
  { batchId, index, encodedVibes, nSamples }: BuildOptions
): GenerateRequestBody {
  const baseSeed = parseSeed(form.seed);
  const characters = supportsCharacters(form.model)
    ? form.characters
        .filter((character) => character.enabled && character.prompt.trim())
        .map((character) => ({
          prompt: characterCaption(character.gender, character.prompt),
          ...(character.negativePrompt.trim()
            ? { negative_prompt: character.negativePrompt.trim() }
            : {}),
          // Don't send it when no position is set (sending it turns on
          // use_coords).
          ...(character.position ? { position: character.position } : {}),
        }))
    : undefined;

  // Vibe and precise reference can't be combined, so include only one depending
  // on the mode.
  const useVibes = form.referenceMode === "vibe" && encodedVibes.length > 0;
  const useReferences =
    form.referenceMode === "reference" &&
    form.references.length > 0 &&
    supportsReferences(form.model);

  return {
    prompt: form.prompt.trim(),
    ...(form.negativePrompt.trim()
      ? { negative_prompt: form.negativePrompt.trim() }
      : {}),
    model: form.model,
    size: form.size,
    sampler: form.sampler,
    noise_schedule: form.noiseSchedule,
    uc_preset: form.ucPreset,
    steps: form.steps,
    scale: form.scale,
    cfg_rescale: form.cfgRescale,
    ...(baseSeed === null ? {} : { seed: baseSeed + index }),
    quality: form.quality,
    variety_boost: form.varietyBoost,
    image_format: "png",
    batch_id: batchId,
    index,
    ...(nSamples === undefined ? {} : { n_samples: nSamples }),
    ...(characters && characters.length > 0 ? { characters } : {}),
    // One or the other. A mask means the run is an infill, which NovelAI does
    // with a different model, so sending both would be rejected downstream.
    ...(form.inpaint
      ? {
          inpaint: {
            image: form.inpaint.imageBase64,
            mask: form.inpaint.maskBase64,
            strength: form.inpaint.strength,
          },
        }
      : form.i2i
        ? {
            i2i: {
              image: form.i2i.imageBase64,
              strength: form.i2i.strength,
              noise: form.i2i.noise,
            },
          }
        : {}),
    ...(useVibes
      ? {
          controlnet: {
            images: encodedVibes.map((vibe) => ({
              encoded: vibe.encoded,
              strength: vibe.strength,
            })),
          },
        }
      : {}),
    ...(useReferences
      ? {
          character_references: form.references.map((reference) => ({
            image: reference.imageBase64,
            type: reference.referenceType,
            strength: reference.strength,
            fidelity: reference.fidelity,
          })),
        }
      : {}),
  };
}
