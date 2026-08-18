import { mkdir, rename, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import { configDir } from "./paths";

/**
 * Long edge of a thumbnail.
 *
 * The history strip draws about 48x64 CSS px and the widest library tile 224,
 * so 512 covers every small view even at 2x device pixels. Against a typical
 * 832x1216 NovelAI png it lands near 20 KB — around seventy times smaller than
 * the source, which is the whole point: the strip used to pull the full image
 * to fill a thumbnail.
 */
const MAX_EDGE = 512;
const QUALITY = 72;

/**
 * libvips keeps an operation cache and a thread pool, neither of which earns
 * its memory here: each thumbnail is produced exactly once and never again.
 */
sharp.cache(false);
sharp.concurrency(1);

/**
 * How many thumbnails may be produced at once. A library opened for the first
 * time asks for every thumbnail at once, and letting all of those into libvips
 * together would spike memory for no gain — the work is CPU bound either way.
 */
const MAX_PARALLEL = 2;

function createLimiter(max: number) {
  let active = 0;
  const waiting: Array<() => void> = [];

  return {
    acquire(): Promise<void> {
      if (active < max) {
        active += 1;
        return Promise.resolve();
      }
      return new Promise<void>((resolve) => {
        waiting.push(resolve);
      });
    },
    release() {
      active -= 1;
      // Hand the slot over before resolving, so a caller that runs between the
      // release and the waiter resuming cannot take the same slot twice.
      if (active < max) {
        const resume = waiting.shift();
        if (resume) {
          active += 1;
          resume();
        }
      }
    },
  };
}

const limiter = createLimiter(MAX_PARALLEL);

/**
 * Thumbnails live in the config directory, not beside the image.
 *
 * The output directory is a folder the person browses in a file manager, and
 * doubling its file count with derived files makes it worse to look at. This is
 * a cache: it belongs with the app's own state, and it can be deleted at any
 * time without losing anything.
 */
function thumbnailsDir(): string {
  return join(configDir(), "thumbnails");
}

export function thumbnailPath(id: string): string {
  return join(thumbnailsDir(), `${id}.webp`);
}

// Requests for the same thumbnail while one is being produced, keyed by id.
// Opening the history asks for every visible thumbnail at once, and without
// this the same image would be decoded once per tile that shows it.
const inFlight = new Map<string, Promise<boolean>>();

async function generate(sourcePath: string, target: string): Promise<boolean> {
  await limiter.acquire();
  try {
    const bytes = await sharp(sourcePath)
      .resize(MAX_EDGE, MAX_EDGE, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: QUALITY })
      .toBuffer();

    await mkdir(thumbnailsDir(), { recursive: true });
    const tmp = `${target}.${crypto.randomUUID()}.tmp`;
    await writeFile(tmp, bytes);
    await rename(tmp, target).catch(async (error: unknown) => {
      await rm(tmp, { force: true });
      throw error;
    });
    return true;
  } catch {
    // A thumbnail is an optimisation. A source that sharp cannot read must not
    // take the request down with it — the caller falls back to the full image.
    return false;
  } finally {
    limiter.release();
  }
}

/**
 * Returns the cached thumbnail's path, producing it first if it is missing.
 * Null when the source could not be read.
 *
 * Images saved before this existed — and any dropped into the output directory
 * by hand — have no thumbnail, so it is made on the first request and kept.
 */
export async function ensureThumbnail(
  id: string,
  sourcePath: string
): Promise<string | null> {
  const target = thumbnailPath(id);
  if (await Bun.file(target).exists()) return target;

  const running = inFlight.get(id);
  if (running) return (await running) ? target : null;

  const job = generate(sourcePath, target);
  inFlight.set(id, job);
  try {
    return (await job) ? target : null;
  } finally {
    inFlight.delete(id);
  }
}

/** Best-effort: a thumbnail left behind is 20 KB, a failed delete is not worth raising. */
export async function deleteThumbnail(id: string): Promise<void> {
  await rm(thumbnailPath(id), { force: true }).catch(() => undefined);
}
