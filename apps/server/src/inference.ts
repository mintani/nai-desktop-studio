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

// A loaded session is kept for the life of the process: the artist model
// takes seconds to load and every analysis would pay that again.
const sessions = new Map<string, Promise<ort.InferenceSession>>();

export function loadSession(spec: ModelSpec): Promise<ort.InferenceSession> {
  let session = sessions.get(spec.id);
  if (!session) {
    session = ort.InferenceSession.create(modelPath(spec, "model.onnx")).catch(
      (error: unknown) => {
        sessions.delete(spec.id);
        throw error;
      }
    );
    sessions.set(spec.id, session);
  }
  return session;
}

/** Forgets a loaded session, e.g. because its files are being deleted. */
export async function dropSession(id: string): Promise<void> {
  const session = sessions.get(id);
  sessions.delete(id);
  if (!session) return;
  await session.then((loaded) => loaded.release()).catch(() => undefined);
}

export async function imageTensor(
  source: ImageSource,
  size: number
): Promise<ort.Tensor> {
  const { data, info } = await sharp(source)
    .flatten({ background: "#ffffff" })
    .resize(size, size, { fit: "fill", kernel: "lanczos3" })
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
  const session = await loadSession(spec);
  const inputName = session.inputNames[0];
  const outputName = session.outputNames[0];
  if (!inputName || !outputName) {
    throw new Error(`${spec.id} declares no input or output`);
  }
  const tensor = await imageTensor(source, spec.inputSize);
  const outputs = await session.run({ [inputName]: tensor });
  const output = outputs[outputName]?.data;
  if (!(output instanceof Float32Array)) {
    throw new Error(`${spec.id} returned an unexpected output type`);
  }
  return output;
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
 * wrapped in single quotes.
 */
async function labelsFromCsv(path: string): Promise<string[]> {
  const text = await readFile(path, "utf-8");
  return text
    .split("\n")
    .slice(1)
    .filter((line) => line.trim().length > 0)
    .map((line) => {
      const name = line.slice(line.indexOf(",") + 1).trim();
      return name.replace(/^'|'$/g, "");
    });
}

/**
 * The artist model's class list, index to Danbooru artist tag, from the CSV
 * that ships beside the weights.
 */
export function loadLabels(spec: ModelSpec): Promise<string[]> {
  let labels = labelCache.get(spec.id);
  if (!labels) {
    labels = labelsFromCsv(modelPath(spec, "labels.csv"));
    labels.catch(() => labelCache.delete(spec.id));
    labelCache.set(spec.id, labels);
  }
  return labels;
}
