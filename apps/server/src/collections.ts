import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { Hono } from "hono";
import { configDir } from "./paths";

const COLLECTION_NAMES = ["characters", "situations", "styles"] as const;
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

export const collectionsRouter = new Hono()
  .get("/:name", async (c) => {
    const name = c.req.param("name");
    if (!isCollectionName(name)) {
      return c.json({ error: "Unknown collection" }, 404);
    }
    const items = [...(await load(name))].sort(byUpdatedAtDesc);
    return c.json({ items });
  })
  .put("/:name/:id", async (c) => {
    const name = c.req.param("name");
    if (!isCollectionName(name)) {
      return c.json({ error: "Unknown collection" }, 404);
    }
    // Read by hand rather than through a schema: a record's shape belongs to
    // the web app, and the server only insists that it is an object with the
    // id from the path.
    const body: unknown = await c.req.json().catch(() => null);
    if (!isPlainObject(body)) {
      return c.json({ error: "Record must be an object" }, 400);
    }
    // The path id wins over any id in the body.
    const record: CollectionRecord = { ...body, id: c.req.param("id") };
    return c.json(await upsert(name, record));
  })
  .delete("/:name/:id", async (c) => {
    const name = c.req.param("name");
    if (!isCollectionName(name)) {
      return c.json({ error: "Unknown collection" }, 404);
    }
    if (!(await remove(name, c.req.param("id")))) {
      return c.json({ error: "Record not found" }, 404);
    }
    return c.json({ ok: true });
  });
