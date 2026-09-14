import { mkdir, open, rename, rm, stat } from "node:fs/promises";
import { createReadStream } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { configDir } from "./paths";

/**
 * The models the analysis endpoints run. They are not shipped with the app:
 * the artist classifier alone is 700 MB, so they are fetched into the config
 * directory the first time they are asked for, and stay there.
 *
 * URLs pin a Hugging Face revision, so the byte counts below stay true and a
 * file that arrives with a different size is treated as not downloaded.
 */
export type ModelRole = "artist";

export type ModelFile = {
  name: string;
  url: string;
  bytes: number;
  /**
   * Checked once, when the download completes; a file that is only the
   * right length is not enough proof after a resume onto a stale part.
   */
  sha256?: string;
};

export type ModelSpec = {
  id: string;
  role: ModelRole;
  /** Shown to the person, with where the weights come from. */
  label: string;
  source: string;
  /** Side of the square input the model takes, in pixels. */
  inputSize: number;
  files: ModelFile[];
};

const KALOSCOPE =
  "https://huggingface.co/DraconicDragon/Kaloscope-onnx/resolve/9943edc1c2baaa6b496e1e71be8f161cb7be8252";

export const MODELS: readonly ModelSpec[] = [
  {
    // A Danbooru artist classifier: 39,261 artists, top-1 90% on its own
    // validation split. The clearest answer available to "whose style is
    // this" for anime images.
    id: "kaloscope-2.0",
    role: "artist",
    label: "Kaloscope 2.0",
    source: "https://huggingface.co/heathcliff01/Kaloscope2.0",
    inputSize: 448,
    files: [
      {
        name: "model.onnx",
        url: `${KALOSCOPE}/v2.0/kaloscope_2-0.onnx`,
        bytes: 733_886_867,
        sha256:
          "b50ab39b8986a2da9c4070226fb7f1009a34896ddf3c316156a84c64b0433219",
      },
      {
        name: "labels.csv",
        url: `${KALOSCOPE}/v2.0/class_mapping.csv`,
        bytes: 750_182,
      },
    ],
  },
];

export function findModel(id: string): ModelSpec | undefined {
  return MODELS.find((model) => model.id === id);
}

/** The one model for a role. */
export function modelForRole(role: ModelRole): ModelSpec {
  const model = MODELS.find((candidate) => candidate.role === role);
  if (!model) throw new Error(`No model registered for ${role}`);
  return model;
}

function modelsDir(): string {
  return join(configDir(), "models");
}

export function modelDir(spec: ModelSpec): string {
  return join(modelsDir(), spec.id);
}

export function modelPath(spec: ModelSpec, name: string): string {
  return join(modelDir(spec), name);
}

/**
 * A file counts as present only at the exact size the registry expects. The
 * checksum is verified when the download lands (see downloadFile), not on
 * every check: hashing 700 MB on each request would cost seconds.
 */
async function fileReady(spec: ModelSpec, file: ModelFile): Promise<boolean> {
  const info = await stat(modelPath(spec, file.name)).catch(() => null);
  return info !== null && info.size === file.bytes;
}

export async function isModelReady(spec: ModelSpec): Promise<boolean> {
  const checks = await Promise.all(
    spec.files.map((file) => fileReady(spec, file))
  );
  return checks.every(Boolean);
}

type Download = {
  received: number;
  total: number;
  error: string | null;
  done: boolean;
};

// One download per model at a time. The entry stays after it finishes so the
// status can report the error, and is replaced by the next attempt.
const downloads = new Map<string, Download>();

export type ModelStatus = {
  id: string;
  role: ModelRole;
  label: string;
  source: string;
  bytes: number;
  ready: boolean;
  downloading: boolean;
  received: number;
  error: string | null;
};

export async function modelStatus(spec: ModelSpec): Promise<ModelStatus> {
  const download = downloads.get(spec.id);
  return {
    id: spec.id,
    role: spec.role,
    label: spec.label,
    source: spec.source,
    bytes: spec.files.reduce((sum, file) => sum + file.bytes, 0),
    ready: await isModelReady(spec),
    downloading: download !== undefined && !download.done,
    received: download?.received ?? 0,
    error: download?.done ? download.error : null,
  };
}

/** How many times one file is re-requested after its stream ends early. */
const MAX_RESUMES = 8;

function partPath(target: string): string {
  return `${target}.part`;
}

async function sizeOf(path: string): Promise<number> {
  const info = await stat(path).catch(() => null);
  return info?.size ?? 0;
}

async function sha256Of(path: string): Promise<string> {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest("hex");
}

/**
 * Fetches one file into `<target>.part`, then renames it into place once it
 * has every byte, so a half-written model is never mistaken for a whole one.
 *
 * The big model is 700 MB and the connection to the CDN does not always last
 * that long: the stream can end cleanly well short of the file. Each such end
 * is answered with a Range request from where the part file stops, up to
 * MAX_RESUMES times, and the part file is kept on failure so the next attempt
 * carries on from there instead of from zero.
 */
async function downloadFile(
  file: ModelFile,
  target: string,
  onChunk: (bytes: number) => void
): Promise<void> {
  const part = partPath(target);
  let offset = await sizeOf(part);
  if (offset > file.bytes) {
    await rm(part, { force: true });
    offset = 0;
  }
  onChunk(offset);

  for (let attempt = 0; offset < file.bytes; attempt++) {
    const response = await fetch(file.url, {
      headers: offset > 0 ? { Range: `bytes=${offset}-` } : {},
    });
    if (!response.ok || !response.body) {
      throw new Error(`Download failed with status ${response.status}`);
    }
    // A server that ignores the range answers 200 with the whole file; then
    // the part written so far has to go. A 206 is only usable if it starts
    // exactly where the part stops.
    const resumed = response.status === 206;
    if (resumed) {
      const range = response.headers.get("content-range") ?? "";
      if (!range.startsWith(`bytes ${offset}-`)) {
        throw new Error(`Server answered the wrong range (${range || "none"})`);
      }
    } else if (offset > 0) {
      await rm(part, { force: true });
      onChunk(-offset);
      offset = 0;
    }

    const handle = await open(part, "a");
    try {
      for await (const chunk of response.body) {
        await handle.write(chunk);
        offset += chunk.byteLength;
        onChunk(chunk.byteLength);
      }
    } finally {
      await handle.close();
    }

    if (offset > file.bytes) {
      await rm(part, { force: true });
      throw new Error(`Downloaded ${offset} bytes, expected ${file.bytes}`);
    }
    if (offset < file.bytes && attempt >= MAX_RESUMES) {
      throw new Error(
        `The connection kept closing early (${offset} of ${file.bytes} bytes). Try again to resume.`
      );
    }
  }

  if (file.sha256) {
    const actual = await sha256Of(part);
    if (actual !== file.sha256) {
      await rm(part, { force: true });
      throw new Error("The downloaded file is corrupt (checksum mismatch)");
    }
  }
  await rename(part, target);
}

/**
 * Starts fetching a model's files in the background. Calling it again while a
 * download runs does nothing. Files already present are skipped and a partly
 * written file is resumed, so an interrupted download picks up where it
 * stopped.
 */
export function startDownload(spec: ModelSpec): void {
  const running = downloads.get(spec.id);
  if (running && !running.done) return;

  const state: Download = {
    received: 0,
    total: spec.files.reduce((sum, file) => sum + file.bytes, 0),
    error: null,
    done: false,
  };
  downloads.set(spec.id, state);

  void (async () => {
    try {
      await mkdir(modelDir(spec), { recursive: true });
      for (const file of spec.files) {
        if (await fileReady(spec, file)) {
          state.received += file.bytes;
          continue;
        }
        await downloadFile(file, modelPath(spec, file.name), (bytes) => {
          state.received += bytes;
        });
      }
    } catch (error) {
      state.error = error instanceof Error ? error.message : "Download failed";
    } finally {
      state.done = true;
    }
  })();
}

export async function deleteModel(spec: ModelSpec): Promise<void> {
  await rm(modelDir(spec), { recursive: true, force: true });
}
