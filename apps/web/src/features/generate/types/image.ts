/**
 * One generated image saved in the server's library (output directory). Same
 * shape as StoredImage in `apps/server/src/library.ts`, so if you change one,
 * fix the other.
 */
export type GeneratedImage = {
  id: string;
  /** ISO 8601. Used for sorting the history and grouping batches. */
  createdAt: string;
  /** ID that groups images made by the same "generate" click. */
  batchId: string;
  /** Index within the batch (0-based). Used for the slot display order. */
  index: number;
  /**
   * Server-relative path (e.g. `/images/<id>/file`). Prefixed with SERVER_URL
   * when displayed.
   */
  path: string;
  /**
   * Server-relative path to the small version (a ~512px WebP). Roughly seventy
   * times lighter than `path`, so every view that draws the image small uses
   * this one and only the enlarged view loads the original.
   */
  thumbPath: string;
  prompt: string;
  negativePrompt: string;
  model: string;
  width: number;
  height: number;
  steps: number;
  scale: number;
  sampler: string;
  seed: number;
};

/**
 * A slot during generation. While image is null, a placeholder (spinner) is
 * shown. One batch = an array of slots, filled from the start in order.
 */
export type GenerationSlot = {
  key: string;
  image: GeneratedImage | null;
  /** Live preview during generation (data URL). image is set once finished. */
  previewDataUrl: string | null;
  /**
   * width / height of the image this slot is making. Known before the first
   * pixel arrives, so the skeleton, the preview and the finished image can all
   * be drawn on one footprint and nothing resizes mid-generation.
   */
  aspect: number;
};
