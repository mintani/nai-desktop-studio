import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { Elysia } from "elysia";
import { configDir } from "./paths";

const COLLECTION_NAMES = [
  "characters",
  "situations",
  "styles",
  "references",
] as const;
type CollectionName = (typeof COLLECTION_NAMES)[number];

function isCollectionName(value: string): value is CollectionName {
  return (COLLECTION_NAMES as readonly string[]).includes(value);
}

/**
 * A stored record is opaque: the server only guarantees a non-empty string id
 * and preserves every other field verbatim. The web owns the entity schema and
 * normalizes on read, so keeping a second schema here would only drift.
 */
type CollectionRecord = Record<string, unknown> & { id: string };

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasStringId(value: unknown): value is CollectionRecord {
  return (
    isPlainObject(value) && typeof value.id === "string" && value.id.length > 0
  );
}

function collectionsDir(): string {
  return join(configDir(), "collections");
}

function filePath(name: CollectionName): string {
  return join(collectionsDir(), `${name}.json`);
}

// One cached array per collection, mirroring the on-disk file. Updated only
// after a successful write, so a failed persist leaves the cache untouched.
const cache = new Map<CollectionName, CollectionRecord[]>();

async function load(name: CollectionName): Promise<CollectionRecord[]> {
  const cached = cache.get(name);
  if (cached) return cached;

  let records: CollectionRecord[] = [];
  try {
    const raw = await readFile(filePath(name), "utf-8");
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) records = parsed.filter(hasStringId);
  } catch {
    // Missing or unreadable file is an empty collection.
  }
  cache.set(name, records);
  return records;
}

/** Write to a sibling temp file then rename, so a crash mid-write keeps the
 * previous file intact (rename within a directory is atomic). */
async function persist(
  name: CollectionName,
  records: CollectionRecord[]
): Promise<void> {
  const dir = collectionsDir();
  await mkdir(dir, { recursive: true });
  const file = filePath(name);
  const tmp = join(dir, `.${name}.${crypto.randomUUID()}.tmp`);
  await writeFile(tmp, JSON.stringify(records, null, 2));
  await rename(tmp, file).catch(async (error) => {
    await rm(tmp, { force: true });
    throw error;
  });
}

/**
 * One write at a time per collection.
 *
 * A write reads the current records, changes one, and writes the whole array
 * back. The editor autosaves while typing, so two of those overlap easily —
 * and interleaved, both would start from the same snapshot and the second
 * write would silently drop the first one's record. Chaining them costs
 * nothing (the writes are milliseconds apart) and removes the whole class.
 */
const writes = new Map<CollectionName, Promise<unknown>>();

function serialize<T>(
  name: CollectionName,
  task: () => Promise<T>
): Promise<T> {
  const previous = writes.get(name) ?? Promise.resolve();
  const next = previous.then(task, task);
  // The chain must survive a failed write, so the link stored for the next
  // caller is one that always settles.
  writes.set(
    name,
    next.catch(() => undefined)
  );
  return next;
}

function upsert(
  name: CollectionName,
  record: CollectionRecord
): Promise<CollectionRecord> {
  return serialize(name, async () => {
    const current = await load(name);
    const next = current.slice();
    const idx = next.findIndex((r) => r.id === record.id);
    if (idx >= 0) next[idx] = record;
    else next.push(record);
    await persist(name, next);
    cache.set(name, next);
    return record;
  });
}

function remove(name: CollectionName, id: string): Promise<boolean> {
  return serialize(name, async () => {
    const current = await load(name);
    const idx = current.findIndex((r) => r.id === id);
    if (idx < 0) return false;
    const next = current.slice();
    next.splice(idx, 1);
    await persist(name, next);
    cache.set(name, next);
    return true;
  });
}

/**
 * Newest updatedAt first when present; records without it sort last and keep
 * their insertion order (a stable sort leaves equal keys untouched).
 */
function byUpdatedAtDesc(a: CollectionRecord, b: CollectionRecord): number {
  const ua = typeof a.updatedAt === "string" ? a.updatedAt : "";
  const ub = typeof b.updatedAt === "string" ? b.updatedAt : "";
  return ub.localeCompare(ua);
}

/** Reads a collection from inside the server. The web owns the shape, so the
 * caller narrows it. */
export async function readCollection(
  name: CollectionName
): Promise<CollectionRecord[]> {
  return load(name);
}

/** Replaces one record in place. Used to write back a cached encode. */
export async function patchCollectionRecord(
  name: CollectionName,
  id: string,
  patch: Record<string, unknown>
): Promise<void> {
  const current = await load(name);
  const found = current.find((record) => record.id === id);
  if (!found) return;
  await upsert(name, { ...found, ...patch, id });
}

export const collectionsRouter = new Elysia({ prefix: "/collections" })
  .get("/:name", async ({ params, set }) => {
    if (!isCollectionName(params.name)) {
      set.status = 404;
      return { error: "Unknown collection" };
    }
    const items = [...(await load(params.name))].sort(byUpdatedAtDesc);
    return { items };
  })
  .put("/:name/:id", async ({ params, body, set }) => {
    if (!isCollectionName(params.name)) {
      set.status = 404;
      return { error: "Unknown collection" };
    }
    if (!isPlainObject(body)) {
      set.status = 400;
      return { error: "Record must be an object" };
    }
    // The path id wins over any id in the body.
    const record: CollectionRecord = { ...body, id: params.id };
    return upsert(params.name, record);
  })
  .delete("/:name/:id", async ({ params, set }) => {
    if (!isCollectionName(params.name)) {
      set.status = 404;
      return { error: "Unknown collection" };
    }
    if (!(await remove(params.name, params.id))) {
      set.status = 404;
      return { error: "Record not found" };
    }
    return { ok: true };
  });
