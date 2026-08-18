import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { Elysia } from "elysia";
import { z } from "zod";

interface IndexedTag {
  name: string;
  categoryId: number;
  count: number;
  aliases: string[];
  searchTokens: string[];
  isArtist: boolean;
  displayName: string;
}

const CSV_RELATIVE = join("scripts", "danbooru_e621_merged.csv");

/**
 * Search upward from the module location for the CSV, so the server finds the
 * repo-root scripts/ even when started from apps/server (avoids depending on
 * process.cwd).
 */
function findCsvPath(): string | null {
  let dir = import.meta.dir;
  for (let i = 0; i < 10; i++) {
    const candidate = join(dir, CSV_RELATIVE);
    if (existsSync(candidate)) return candidate;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

let tagCache: IndexedTag[] | null = null;
let warnedMissing = false;

async function loadTags(): Promise<IndexedTag[]> {
  if (tagCache) return tagCache;

  const csvPath = findCsvPath();
  if (!csvPath) {
    if (!warnedMissing) {
      console.warn(`Tag CSV not found (${CSV_RELATIVE}); tag search disabled.`);
      warnedMissing = true;
    }
    tagCache = [];
    return tagCache;
  }

  try {
    const csvContent = await readFile(csvPath, "utf-8");
    tagCache = parseCsv(csvContent);
  } catch (error) {
    console.error("Failed to load tag CSV:", error);
    tagCache = [];
  }
  return tagCache;
}

function parseCsv(csvContent: string): IndexedTag[] {
  return csvContent
    .split("\n")
    .filter((line) => line.trim())
    .map((line): IndexedTag | null => {
      const parts = line.split(",");
      if (parts.length < 4) return null;

      const name = parts[0] ?? "";
      const categoryId = Number.parseInt(parts[1] ?? "", 10);
      const count = Number.parseInt(parts[2] ?? "", 10);
      const aliases = parts
        .slice(3)
        .join(",")
        .replace(/^"|"$/g, "")
        .split(",")
        .map((alias) => alias.trim())
        .filter((alias) => alias.length > 0);

      const isArtist = categoryId === 1;
      const displayName = isArtist ? `artist:${name}` : name;
      const searchTokens = [
        name.toLowerCase(),
        ...aliases.map((alias) => alias.toLowerCase()),
        displayName.toLowerCase(),
      ].filter((token, i, arr) => arr.indexOf(token) === i);

      return {
        name,
        categoryId,
        count,
        aliases,
        isArtist,
        displayName,
        searchTokens,
      };
    })
    .filter((tag): tag is IndexedTag => tag !== null)
    .sort((a, b) => b.count - a.count);
}

function searchTags(tags: IndexedTag[], query: string, limit: number) {
  const lowerQuery = query.toLowerCase();

  return tags
    .filter((tag) =>
      tag.searchTokens.some((token) => token.includes(lowerQuery))
    )
    .sort((a, b) => {
      const aExact = a.searchTokens.some((token) => token === lowerQuery);
      const bExact = b.searchTokens.some((token) => token === lowerQuery);
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;

      const aPrefix = a.searchTokens.some((token) =>
        token.startsWith(lowerQuery)
      );
      const bPrefix = b.searchTokens.some((token) =>
        token.startsWith(lowerQuery)
      );
      if (aPrefix && !bPrefix) return -1;
      if (!aPrefix && bPrefix) return 1;

      return 0;
    })
    .slice(0, limit)
    .map((tag) => ({
      name: tag.name,
      categoryId: tag.categoryId,
      count: tag.count,
      isArtist: tag.isArtist,
      displayName: tag.displayName,
    }));
}

const searchQuerySchema = z.object({
  q: z.string().min(1).max(50),
  limit: z.coerce.number().int().min(1).max(50).optional(),
});

export const tagsRouter = new Elysia({ prefix: "/tags" }).get(
  "/search",
  async ({ query }) => {
    const allTags = await loadTags();
    const results = searchTags(allTags, query.q, query.limit ?? 20);
    return { query: query.q, results, total: results.length };
  },
  { query: searchQuerySchema }
);
