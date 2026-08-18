"use client";

import {
  IMAGE_MODELS,
  NOISE_SCHEDULES,
  SAMPLERS,
} from "@nai-desktop-studio/novelai/constants";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  cloneAsset,
  deleteAssetsByPath,
  deleteCollectionItem,
  listCollection,
  saveCollectionItem,
} from "@/features/library/collections";

import {
  createEmptyStyle,
  STYLE_PROMPT_POSITIONS,
  STYLE_REFERENCE_TYPES,
  type Style,
  type StyleReference,
  type StyleVibe,
} from "../types/style";

export const stylesQueryKey = ["collections", "styles"] as const;

const DEFAULT_VIBE_STRENGTH = 0.6;
const DEFAULT_VIBE_INFO_EXTRACTED = 0.7;
const DEFAULT_REFERENCE_STRENGTH = 1;
const DEFAULT_REFERENCE_FIDELITY = 1;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const isString = (value: unknown): value is string => typeof value === "string";
const isNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

function oneOf<T extends string>(list: readonly T[], value: unknown): T | null {
  return isString(value) && (list as readonly string[]).includes(value)
    ? (value as T)
    : null;
}

const bySortOrder = (a: { sortOrder: number }, b: { sortOrder: number }) =>
  a.sortOrder - b.sortOrder;

function normalizeVibe(raw: unknown): StyleVibe | null {
  if (!isRecord(raw) || !isString(raw.id) || !isString(raw.imagePath)) {
    return null;
  }
  return {
    id: raw.id,
    imagePath: raw.imagePath,
    strength: isNumber(raw.strength) ? raw.strength : DEFAULT_VIBE_STRENGTH,
    infoExtracted: isNumber(raw.infoExtracted)
      ? raw.infoExtracted
      : DEFAULT_VIBE_INFO_EXTRACTED,
    sortOrder: isNumber(raw.sortOrder) ? raw.sortOrder : 0,
  };
}

function normalizeReference(raw: unknown): StyleReference | null {
  if (!isRecord(raw) || !isString(raw.id) || !isString(raw.imagePath)) {
    return null;
  }
  return {
    id: raw.id,
    imagePath: raw.imagePath,
    referenceType:
      oneOf(STYLE_REFERENCE_TYPES, raw.referenceType) ?? "character",
    strength: isNumber(raw.strength)
      ? raw.strength
      : DEFAULT_REFERENCE_STRENGTH,
    fidelity: isNumber(raw.fidelity)
      ? raw.fidelity
      : DEFAULT_REFERENCE_FIDELITY,
    sortOrder: isNumber(raw.sortOrder) ? raw.sortOrder : 0,
  };
}

/**
 * The server stores each record verbatim, so the web owns the shape and fills
 * missing or malformed fields with the empty-style defaults on read.
 */
function normalizeStyle(raw: unknown): Style | null {
  if (!isRecord(raw) || !isString(raw.id)) return null;
  const base = createEmptyStyle(isString(raw.name) ? raw.name : "");
  const vibes = Array.isArray(raw.vibes)
    ? raw.vibes.flatMap((v) => {
        const vibe = normalizeVibe(v);
        return vibe ? [vibe] : [];
      })
    : [];
  const references = Array.isArray(raw.references)
    ? raw.references.flatMap((r) => {
        const reference = normalizeReference(r);
        return reference ? [reference] : [];
      })
    : [];
  return {
    ...base,
    id: raw.id,
    name: isString(raw.name) ? raw.name : "",
    groupName: isString(raw.groupName) ? raw.groupName : null,
    samplePath: isString(raw.samplePath) ? raw.samplePath : null,
    styleTag: isString(raw.styleTag) ? raw.styleTag : "",
    negativeTag: isString(raw.negativeTag) ? raw.negativeTag : "",
    promptPosition:
      oneOf(STYLE_PROMPT_POSITIONS, raw.promptPosition) ?? "after_quality",
    negativePosition:
      oneOf(STYLE_PROMPT_POSITIONS, raw.negativePosition) ?? "after_quality",
    model: oneOf(IMAGE_MODELS, raw.model),
    steps: isNumber(raw.steps) ? raw.steps : null,
    scale: isNumber(raw.scale) ? raw.scale : null,
    cfgRescale: isNumber(raw.cfgRescale) ? raw.cfgRescale : null,
    varietyBoost:
      typeof raw.varietyBoost === "boolean" ? raw.varietyBoost : null,
    sampler: oneOf(SAMPLERS, raw.sampler),
    noiseSchedule: oneOf(NOISE_SCHEDULES, raw.noiseSchedule),
    vibes: [...vibes].sort(bySortOrder),
    references: [...references].sort(bySortOrder),
    createdAt: isString(raw.createdAt) ? raw.createdAt : base.createdAt,
    updatedAt: isString(raw.updatedAt) ? raw.updatedAt : base.updatedAt,
  };
}

/** Every asset a style owns: its sample plus each vibe and reference image. */
export function collectStyleAssetPaths(style: Style): string[] {
  return [
    style.samplePath,
    ...style.vibes.map((vibe) => vibe.imagePath),
    ...style.references.map((reference) => reference.imagePath),
  ].filter((path): path is string => isString(path) && path.length > 0);
}

/**
 * Builds an independent copy: images are re-uploaded so the copy owns its own
 * assets and deleting either style never strands the other's images. Images
 * whose bytes can't be re-fetched are dropped rather than shared.
 */
export async function duplicateStyle(
  style: Style,
  copyWord: string
): Promise<Style> {
  const [samplePath, vibes, references] = await Promise.all([
    style.samplePath ? cloneAsset(style.samplePath) : Promise.resolve(null),
    Promise.all(
      style.vibes.map(async (vibe) => ({
        ...vibe,
        id: crypto.randomUUID(),
        imagePath: await cloneAsset(vibe.imagePath),
      }))
    ),
    Promise.all(
      style.references.map(async (reference) => ({
        ...reference,
        id: crypto.randomUUID(),
        imagePath: await cloneAsset(reference.imagePath),
      }))
    ),
  ]);
  const now = new Date().toISOString();
  return {
    ...style,
    id: crypto.randomUUID(),
    name: `${style.name} ${copyWord}`.trim(),
    samplePath,
    vibes: vibes.flatMap(({ imagePath, ...rest }) =>
      imagePath ? [{ ...rest, imagePath }] : []
    ),
    references: references.flatMap(({ imagePath, ...rest }) =>
      imagePath ? [{ ...rest, imagePath }] : []
    ),
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Styles are a JSON collection on the local server, with images stored as
 * separate assets. Deleting a style also deletes its assets so the config dir
 * doesn't fill with orphans.
 */
export function useStyles() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: stylesQueryKey,
    queryFn: async () => {
      const { items } = await listCollection("styles");
      return items.flatMap((item) => {
        const style = normalizeStyle(item);
        return style ? [style] : [];
      });
    },
  });

  const save = useMutation({
    mutationFn: (style: Style) => saveCollectionItem("styles", style),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: stylesQueryKey }),
  });

  const remove = useMutation({
    mutationFn: async (style: Style) => {
      await deleteAssetsByPath(collectStyleAssetPaths(style));
      await deleteCollectionItem("styles", style.id);
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: stylesQueryKey }),
  });

  return {
    styles: query.data ?? [],
    isPending: query.isPending,
    save,
    remove,
  };
}
