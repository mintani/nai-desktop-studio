import type { Character } from "@/features/characters/lib/template";
import type { Situation } from "@/features/situations/lib/template";
import {
  buildSituationBaseNegativePrompt,
  buildSituationBasePrompt,
  buildSituationCharacterNegativePrompt,
  buildSituationCharacterPrompt,
} from "@/features/situations/lib/template";
import {
  assembleStyledPrompt,
  NEGATIVE_GROUP,
  QUALITY_GROUP,
} from "@/features/styles/lib/style-prompt";
import type { Style } from "@/features/styles/types/style";

import { SAMPLER_OPTIONS } from "../constants";
import type { CharacterData, FormState, Sampler } from "../types/generate";
import { supportsCharacters } from "./build-request";

/** A character picked for the next generation, with where to place it. */
export type SelectedCharacter = {
  character: Character;
  position: string | null;
};

/** A selection with every id already looked up in its collection. */
export type ResolvedTemplate = {
  situation: Situation;
  characters: SelectedCharacter[];
  style: Style | null;
};

export type ComposedPrompt = {
  prompt: string;
  negativePrompt: string;
  characters: CharacterData[];
};

function joinParts(parts: string[]) {
  return parts
    .map((part) => part.trim())
    .filter(Boolean)
    .join(", ");
}

/**
 * Builds the prompts from a situation, its characters and a style.
 *
 * The situation owns the wording; a character only supplies values for the
 * `{token}`s it happens to have. A character's own templates are not used here —
 * they exist so a character can be previewed on its own.
 *
 * The scene text is rendered with the first character's variables, because
 * NovelAI takes one base caption for the whole image. Reordering the characters
 * therefore changes the scene.
 */
export function composeTemplatePrompt(
  { situation, characters, style }: ResolvedTemplate,
  model: string
): ComposedPrompt {
  const primary = characters[0]?.character.variables ?? [];
  const basePrompt = buildSituationBasePrompt(situation, primary);
  const baseNegative = buildSituationBaseNegativePrompt(situation, primary);

  // The subject is carried on the entry rather than glued on here: the request
  // builder puts it at the head of the caption for both modes, so there is one
  // place that decides where it goes.
  const entries = characters
    .map(({ character, position }) => ({
      prompt: buildSituationCharacterPrompt(situation, character.variables),
      negativePrompt: buildSituationCharacterNegativePrompt(
        situation,
        character.variables
      ),
      position,
      gender: character.gender,
      enabled: true,
    }))
    .filter((entry) => entry.prompt !== "");

  // Only V4 sends characters separately. On V3 the only place a character can go
  // is the single prompt, so fold it in there instead of dropping it.
  const perCharacter = supportsCharacters(model);

  return {
    prompt: assembleStyledPrompt(
      perCharacter
        ? basePrompt
        : joinParts([
            basePrompt,
            ...entries.map((entry) =>
              joinParts([entry.gender ?? "", entry.prompt])
            ),
          ]),
      QUALITY_GROUP,
      style?.styleTag ?? "",
      style?.promptPosition ?? "after_quality"
    ),
    negativePrompt: assembleStyledPrompt(
      perCharacter
        ? baseNegative
        : joinParts([
            baseNegative,
            ...entries.map((entry) => entry.negativePrompt),
          ]),
      NEGATIVE_GROUP,
      style?.negativeTag ?? "",
      style?.negativePosition ?? "after_quality"
    ),
    characters: perCharacter ? entries : [],
  };
}

/** One scene of a batch: a form with that scene's prompt already composed in. */
export type GenerationJob = {
  /** Names the scene in the progress line. */
  label: string;
  form: FormState;
};

/**
 * One job per situation, sharing the same cast, style and settings.
 *
 * The batch panel does not write into the prompt box — it hands the runner a
 * finished form per scene. Composing here rather than in the box is what lets
 * one run cover several scenes: a single prompt field can only hold one of
 * them, so writing to it would cap a batch at one situation.
 *
 * A situation that describes neither a scene nor a character is dropped. The
 * check is on the situation's own text, before the quality tags and the style
 * are added — those are never empty, so testing the finished prompt would let
 * a blank scene through and spend a generation on the quality tags alone.
 */
export function composeTemplateJobs(
  base: FormState,
  {
    situations,
    characters,
    style,
  }: {
    situations: Situation[];
    characters: SelectedCharacter[];
    style: Style | null;
  }
): GenerationJob[] {
  const primary = characters[0]?.character.variables ?? [];

  return situations.flatMap((situation) => {
    const scene = buildSituationBasePrompt(situation, primary).trim();
    const cast = characters.some((entry) =>
      buildSituationCharacterPrompt(situation, entry.character.variables).trim()
    );
    if (!scene && !cast) return [];

    const composed = composeTemplatePrompt(
      { situation, characters, style },
      base.model
    );
    return [
      {
        label: situation.name,
        form: {
          ...base,
          prompt: composed.prompt,
          negativePrompt: composed.negativePrompt,
          characters: composed.characters,
        },
      },
    ];
  });
}

/**
 * The parts of the form a style overrides. A null field means the style does not
 * care, so the current setting stays.
 */
/**
 * NovelAI accepts more samplers than the panel offers. One outside the list has
 * no control to show it, so it is ignored rather than left invisible in the form.
 */
function offeredSampler(value: string | null): Sampler | null {
  return SAMPLER_OPTIONS.find((sampler) => sampler === value) ?? null;
}

export function styleParamOverrides(style: Style | null): Partial<FormState> {
  if (!style) return {};

  const sampler = offeredSampler(style.sampler);

  return {
    ...(style.model ? { model: style.model } : {}),
    ...(style.steps === null ? {} : { steps: style.steps }),
    ...(style.scale === null ? {} : { scale: style.scale }),
    ...(style.cfgRescale === null ? {} : { cfgRescale: style.cfgRescale }),
    ...(style.varietyBoost === null
      ? {}
      : { varietyBoost: style.varietyBoost }),
    ...(sampler ? { sampler } : {}),
    ...(style.noiseSchedule ? { noiseSchedule: style.noiseSchedule } : {}),
  };
}

/**
 * Composition already includes the quality tags and the negative preset, at the
 * position the style asked for, so the server must not append them a second
 * time. Applied together with the composed prompts.
 */
export const COMPOSED_PROMPT_FLAGS = {
  quality: false,
  ucPreset: "none",
} as const satisfies Partial<FormState>;
