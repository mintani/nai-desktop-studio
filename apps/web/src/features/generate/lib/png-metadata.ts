import {
  NOISE_SCHEDULE_OPTIONS,
  SAMPLER_OPTIONS,
  SIZE_OPTIONS,
} from "../constants";
import type { FormState } from "../types/generate";

/**
 * What could be read back out of a PNG NovelAI produced.
 *
 * Every field is optional: the file may be someone else's export, a re-save
 * that dropped the text chunks, or a version that names things differently.
 * A partial read is still worth having — the prompt alone is usually the
 * reason someone drops an image here.
 */
export type PngMetadata = Partial<
  Pick<
    FormState,
    | "prompt"
    | "negativePrompt"
    | "steps"
    | "scale"
    | "cfgRescale"
    | "seed"
    | "sampler"
    | "noiseSchedule"
    | "size"
  >
>;

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/**
 * The text chunks of a PNG, by keyword.
 *
 * Only `tEXt` is read. NovelAI writes its prompt in `Description` and the rest
 * as JSON in `Comment`, both uncompressed, so the deflate of `zTXt` and the
 * language tags of `iTXt` would be work for files this never sees.
 */
function readTextChunks(bytes: Uint8Array): Map<string, string> {
  const chunks = new Map<string, string>();
  if (bytes.length < 8) return chunks;
  if (PNG_SIGNATURE.some((byte, index) => bytes[index] !== byte)) return chunks;

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const decoder = new TextDecoder();
  let offset = 8;

  // Every chunk is length(4) + type(4) + data + crc(4).
  while (offset + 8 <= bytes.length) {
    const length = view.getUint32(offset);
    const type = decoder.decode(bytes.subarray(offset + 4, offset + 8));
    const start = offset + 8;
    const end = start + length;
    if (end > bytes.length) break;

    if (type === "tEXt") {
      const data = bytes.subarray(start, end);
      const split = data.indexOf(0);
      if (split > 0) {
        chunks.set(
          decoder.decode(data.subarray(0, split)),
          decoder.decode(data.subarray(split + 1))
        );
      }
    }
    if (type === "IEND") break;
    offset = end + 4;
  }

  return chunks;
}

function readNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

function readText(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

/** The preset whose pixels match, so the size comes back as a choice. */
function matchSize(
  width: unknown,
  height: unknown
): FormState["size"] | undefined {
  const w = readNumber(width);
  const h = readNumber(height);
  if (w === undefined || h === undefined) return undefined;
  return SIZE_OPTIONS.find((option) => option.w === w && option.h === h)?.value;
}

function isOneOf<T extends string>(
  value: unknown,
  allowed: readonly T[]
): T | undefined {
  return typeof value === "string" &&
    (allowed as readonly string[]).includes(value)
    ? (value as T)
    : undefined;
}

/**
 * Reads the generation settings NovelAI wrote into a PNG.
 *
 * Returns an empty object for a file that carries none — a photo, a screenshot,
 * an image saved through an editor that dropped the chunks. The caller decides
 * what to do with nothing found; this does not guess.
 */
export function readPngMetadata(bytes: Uint8Array): PngMetadata {
  const chunks = readTextChunks(bytes);
  if (chunks.size === 0) return {};

  const result: PngMetadata = {};

  // Description holds the prompt on its own. It is the one field worth having
  // even when the JSON is missing or unreadable.
  const description = chunks.get("Description");
  if (description) result.prompt = description;

  let comment: Record<string, unknown> = {};
  try {
    const raw = chunks.get("Comment");
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        comment = parsed as Record<string, unknown>;
      }
    }
  } catch {
    // A truncated or re-encoded comment leaves the Description above.
  }

  const prompt = readText(comment.prompt);
  if (prompt) result.prompt = prompt;

  const uc = readText(comment.uc);
  if (uc) result.negativePrompt = uc;

  const steps = readNumber(comment.steps);
  if (steps !== undefined) result.steps = steps;

  const scale = readNumber(comment.scale);
  if (scale !== undefined) result.scale = scale;

  const cfgRescale = readNumber(comment.cfg_rescale);
  if (cfgRescale !== undefined) result.cfgRescale = cfgRescale;

  const seed = readNumber(comment.seed);
  if (seed !== undefined) result.seed = String(seed);

  const sampler = isOneOf(comment.sampler, SAMPLER_OPTIONS);
  if (sampler) result.sampler = sampler;

  const noiseSchedule = isOneOf(comment.noise_schedule, NOISE_SCHEDULE_OPTIONS);
  if (noiseSchedule) result.noiseSchedule = noiseSchedule;

  const size = matchSize(comment.width, comment.height);
  if (size) result.size = size;

  return result;
}

/** How many settings a read produced, for telling the person what was found. */
export function countMetadata(metadata: PngMetadata): number {
  return Object.values(metadata).filter((value) => value !== undefined).length;
}
