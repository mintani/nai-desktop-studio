import { readFile } from "node:fs/promises";
import * as ort from "onnxruntime-node";
import sharp from "sharp";
import { modelPath, type ModelSpec } from "./models";

/**
 * Runs the analysis model with ONNX Runtime, in this process.
 *
 * Preprocessing follows the artist model's reference script: a plain resize
 * to the model's square, ImageNet normalisation, channels first. Transparent
 * pixels are flattened onto white first, because a V5 image with a
 * transparent background keeps arbitrary colour under the alpha and those
 * pixels would otherwise be scored.
 */
const MEAN = [0.485, 0.456, 0.406] as const;
const STD = [0.229, 0.224, 0.225] as const;

export type ImageSource = string | Uint8Array;

type Loaded = {
  session: Promise<ort.InferenceSession>;
  /** Inferences in flight. A dropped session is released once this is 0. */
  running: number;
  dropped: boolean;
};

// A loaded session is kept for the life of the process: the artist model
// takes seconds to load and every analysis would pay that again.
const sessions = new Map<string, Loaded>();

function loadSession(spec: ModelSpec): Loaded {
  let loaded = sessions.get(spec.id);
  if (!loaded) {
    const entry: Loaded = {
      session: ort.InferenceSession.create(modelPath(spec, "model.onnx")),
      running: 0,
      dropped: false,
    };
    // Only this entry is forgotten on failure: a later successful load under
    // the same id must not be evicted by an earlier attempt that lost.
    entry.session.catch(() => {
      if (sessions.get(spec.id) === entry) sessions.delete(spec.id);
    });
    sessions.set(spec.id, entry);
    loaded = entry;
  }
  return loaded;
}

async function release(entry: Loaded): Promise<void> {
  await entry.session.then((session) => session.release()).catch(() => {});
}

/**
 * Runs `fn` against the model's session, counting it as in flight so a
 * concurrent drop waits for it: releasing a native session mid-run is a
 * crash, not an error.
 */
async function withSession<T>(
  spec: ModelSpec,
  fn: (session: ort.InferenceSession) => Promise<T>
): Promise<T> {
  const entry = loadSession(spec);
  entry.running++;
  try {
    return await fn(await entry.session);
  } finally {
    entry.running--;
    if (entry.dropped && entry.running === 0) await release(entry);
  }
}

/** Forgets a loaded session, e.g. because its files are being deleted. */
export async function dropSession(id: string): Promise<void> {
  const entry = sessions.get(id);
  sessions.delete(id);
  if (!entry) return;
  entry.dropped = true;
  if (entry.running === 0) await release(entry);
}

export async function imageTensor(
  source: ImageSource,
  size: number
): Promise<ort.Tensor> {
  const { data, info } = await sharp(source)
    .flatten({ background: "#ffffff" })
    .resize(size, size, { fit: "fill", kernel: "lanczos3" })
    // A CMYK source would otherwise come back as four channels.
    .toColorspace("srgb")
    .raw()
    .toBuffer({ resolveWithObject: true });

  const plane = size * size;
  const channels = info.channels;
  const out = new Float32Array(3 * plane);
  for (let i = 0; i < plane; i++) {
    for (let c = 0; c < 3; c++) {
      // A greyscale source comes back with one channel; read it for all three.
      const value = data[i * channels + Math.min(c, channels - 1)] ?? 0;
      out[c * plane + i] = (value / 255 - MEAN[c]!) / STD[c]!;
    }
  }
  return new ort.Tensor("float32", out, [1, 3, size, size]);
}

/** The model's first output for one image, as a flat array. */
export async function runModel(
  spec: ModelSpec,
  source: ImageSource
): Promise<Float32Array> {
  const tensor = await imageTensor(source, spec.inputSize);
  return withSession(spec, async (session) => {
    const inputName = session.inputNames[0];
    const outputName = session.outputNames[0];
    if (!inputName || !outputName) {
      throw new Error(`${spec.id} declares no input or output`);
    }
    const outputs = await session.run({ [inputName]: tensor });
    const output = outputs[outputName]?.data;
    if (!(output instanceof Float32Array)) {
      throw new Error(`${spec.id} returned an unexpected output type`);
    }
    return output;
  });
}

function softmax(logits: Float32Array): Float32Array {
  let max = Number.NEGATIVE_INFINITY;
  for (const value of logits) if (value > max) max = value;
  const out = new Float32Array(logits.length);
  let sum = 0;
  for (let i = 0; i < logits.length; i++) {
    out[i] = Math.exp(logits[i]! - max);
    sum += out[i]!;
  }
  // One non-finite logit would turn every score into NaN and the ranking
  // into noise; better to say so than to name an artist off it.
  if (!Number.isFinite(sum) || sum === 0) {
    throw new Error("The model returned no usable scores");
  }
  for (let i = 0; i < out.length; i++) out[i] = out[i]! / sum;
  return out;
}

/**
 * Every artist the model knows, scored for one image and sorted best first.
 * The scores are a softmax over the model's logits.
 */
export async function rankArtists(
  spec: ModelSpec,
  source: ImageSource
): Promise<{ index: number; score: number }[]> {
  const scores = softmax(await runModel(spec, source));
  return Array.from(scores, (score, index) => ({ index, score })).sort(
    (a, b) => b.score - a.score
  );
}

const labelCache = new Map<string, Promise<string[]>>();

/**
 * A class list shipped as `class_id,class_name`, one artist per line, names
 * wrapped in single quotes. Placed by class id rather than line order, so
 * the file's ordering cannot silently shift every name by one.
 */
async function labelsFromCsv(path: string): Promise<string[]> {
  const text = await readFile(path, "utf-8");
  const labels: string[] = [];
  for (const line of text.split("\n").slice(1)) {
    const comma = line.indexOf(",");
    if (comma < 0) continue;
    const id = Number(line.slice(0, comma));
    if (!Number.isInteger(id) || id < 0) continue;
    labels[id] = line
      .slice(comma + 1)
      .trim()
      .replace(/^'|'$/g, "");
  }
  return labels;
}

/**
 * The artist model's class list, index to Danbooru artist tag, from the CSV
 * that ships beside the weights.
 */
export function loadLabels(spec: ModelSpec): Promise<string[]> {
  let labels = labelCache.get(spec.id);
  if (!labels) {
    const loading = labelsFromCsv(modelPath(spec, "labels.csv"));
    loading.catch(() => {
      if (labelCache.get(spec.id) === loading) labelCache.delete(spec.id);
    });
    labelCache.set(spec.id, loading);
    labels = loading;
  }
  return labels;
}
