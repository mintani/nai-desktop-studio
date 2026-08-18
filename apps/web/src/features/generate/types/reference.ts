/**
 * Reference mode. Per NovelAI's spec, vibe transfer and precise reference can't
 * be combined in the same generation, so each generation picks one or the other.
 */
export type ReferenceMode = "vibe" | "reference";

export const REFERENCE_TYPES = [
  "character",
  "style",
  "character&style",
] as const;
export type ReferenceType = (typeof REFERENCE_TYPES)[number];

export const REFERENCE_TYPE_LABEL_KEYS: Record<ReferenceType, string> = {
  character: "reference.type.character",
  style: "reference.type.style",
  "character&style": "reference.type.characterStyle",
};

/** Image added for vibe transfer. Encoded at 2 Anlas per image on generate. */
export type AdhocVibe = {
  id: string;
  /** Object URL for preview (imageBase64 is used for generation). */
  previewUrl: string;
  imageBase64: string;
  strength: number;
  infoExtracted: number;
};

/**
 * Image added for precise reference (director reference). 5 Anlas each on
 * generate.
 */
export type AdhocReference = {
  id: string;
  previewUrl: string;
  imageBase64: string;
  referenceType: ReferenceType;
  strength: number;
  fidelity: number;
};

/** Source image for i2i. Higher strength drifts further from the source. */
export type I2iSource = {
  previewUrl: string;
  imageBase64: string;
  strength: number;
  noise: number;
};
