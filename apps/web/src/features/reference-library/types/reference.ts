import type { ReferenceType } from "@/features/generate/types/reference";

/**
 * Which of the two reference kinds an entry is used as. NovelAI cannot take
 * both in one generation, so an entry commits to one when it is saved.
 */
export const REFERENCE_KINDS = ["vibe", "reference"] as const;
export type ReferenceKind = (typeof REFERENCE_KINDS)[number];

export const REFERENCE_KIND_LABEL_KEYS: Record<ReferenceKind, string> = {
  vibe: "reference.mode.vibe",
  reference: "reference.mode.precise",
};

/**
 * One saved reference image and the settings it is used with.
 *
 * A vibe's encode is the expensive part: 2 Anlas, and the same image with the
 * same `infoExtracted` always encodes to the same thing. The server keeps that
 * result on disk, so an entry here is paid for once and free every time after.
 * `encodedAt` is how the panel knows which is which.
 */
export type ReferenceEntry = {
  id: string;
  name: string;
  groupName: string | null;
  kind: ReferenceKind;
  /** Asset path of the source image. */
  imagePath: string;
  /** When the vibe encode was cached. Null means the next use costs 2 Anlas. */
  encodedAt: string | null;
  strength: number;
  /** Vibe only. Changing it throws the cached encode away. */
  infoExtracted: number;
  /** Precise reference only. */
  referenceType: ReferenceType;
  /** Precise reference only. */
  fidelity: number;
  createdAt: string;
  updatedAt: string;
};

export const DEFAULT_VIBE_STRENGTH = 0.6;
export const DEFAULT_INFO_EXTRACTED = 0.7;
export const DEFAULT_REFERENCE_STRENGTH = 1;
export const DEFAULT_FIDELITY = 1;

export function createEmptyReference(
  kind: ReferenceKind,
  name: string,
  imagePath: string
): ReferenceEntry {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    name,
    groupName: null,
    kind,
    imagePath,
    encodedAt: null,
    strength:
      kind === "vibe" ? DEFAULT_VIBE_STRENGTH : DEFAULT_REFERENCE_STRENGTH,
    infoExtracted: DEFAULT_INFO_EXTRACTED,
    referenceType: "character&style",
    fidelity: DEFAULT_FIDELITY,
    createdAt: now,
    updatedAt: now,
  };
}

function readString(input: object, key: string): string | undefined {
  const value: unknown = Reflect.get(input, key);
  return typeof value === "string" ? value : undefined;
}

function readNumber(input: object, key: string, fallback: number): number {
  const value: unknown = Reflect.get(input, key);
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

/** Rebuilds an entry from whatever the store returned. */
export function normalizeReference(
  input: unknown,
  fallbackName: string
): ReferenceEntry {
  const base = createEmptyReference("vibe", fallbackName, "");
  if (!input || typeof input !== "object") return base;

  const kind =
    readString(input, "kind") === "reference"
      ? ("reference" as const)
      : ("vibe" as const);
  const id = readString(input, "id");
  const name = readString(input, "name");
  const groupName = readString(input, "groupName");
  const encodedAt = readString(input, "encodedAt");
  const referenceType = readString(input, "referenceType");
  const createdAt = readString(input, "createdAt");
  const updatedAt = readString(input, "updatedAt");

  return {
    id: id && id.length > 0 ? id : base.id,
    name: name && name.trim().length > 0 ? name.trim() : base.name,
    groupName:
      groupName && groupName.trim().length > 0 ? groupName.trim() : null,
    kind,
    imagePath: readString(input, "imagePath") ?? "",
    encodedAt: encodedAt && encodedAt.length > 0 ? encodedAt : null,
    strength: readNumber(
      input,
      "strength",
      kind === "vibe" ? DEFAULT_VIBE_STRENGTH : DEFAULT_REFERENCE_STRENGTH
    ),
    infoExtracted: readNumber(input, "infoExtracted", DEFAULT_INFO_EXTRACTED),
    referenceType:
      referenceType === "character" || referenceType === "style"
        ? referenceType
        : "character&style",
    fidelity: readNumber(input, "fidelity", DEFAULT_FIDELITY),
    createdAt: createdAt && createdAt.length > 0 ? createdAt : base.createdAt,
    updatedAt: updatedAt && updatedAt.length > 0 ? updatedAt : base.updatedAt,
  };
}

export function searchableReferenceText(entry: ReferenceEntry): string {
  return [entry.name, entry.groupName ?? "", entry.kind]
    .join(" ")
    .toLowerCase();
}
