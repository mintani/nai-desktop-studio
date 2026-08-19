import { chmod, mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { env } from "@nai-desktop-studio/env/server";
import { createNovelAIClient, IMAGE_MODELS } from "@nai-desktop-studio/novelai";
import type { ImageModel } from "@nai-desktop-studio/novelai";
import { onInvalid } from "./http";
import { configDir, defaultOutputDir } from "./paths";

const DEFAULT_MODEL: ImageModel = "nai-diffusion-4-5-full";
const SETTINGS_FILE = "settings.json";

/** Settings as stored on disk. Every field is optional. */
const storedSettingsSchema = z.object({
  apiKey: z.string().min(1).optional(),
  outputDir: z.string().min(1).optional(),
  defaultModel: z.string().min(1).optional(),
  plan: z.enum(["opus", "other"]).optional(),
  generationMode: z.enum(["queue", "alternate"]).optional(),
  /**
   * Which panel sections start expanded. Held as opaque strings: which
   * sections exist is the web app's business, and a second list of names here
   * would be one more place to keep in step.
   */
  openSections: z.array(z.string().min(1).max(40)).max(20).optional(),
});
type StoredSettings = z.infer<typeof storedSettingsSchema>;

export type Plan = "opus" | "other";

/**
 * How a multi-image request is issued. queue loops one streaming request per
 * image (n_samples 1, free on Opus); alternate asks NovelAI for all images in
 * one request (a ZIP; consumes Anlas).
 */
export type GenerationMode = "queue" | "alternate";

type ResolvedSettings = {
  apiKey: string | null;
  outputDir: string;
  defaultModel: ImageModel;
  plan: Plan;
  generationMode: GenerationMode;
  openSections: string[];
};

/** Public view returned to the client, without the API key. */
export type SettingsView = {
  hasApiKey: boolean;
  apiKeyPreview: string | null;
  outputDir: string;
  defaultModel: ImageModel;
  plan: Plan;
  generationMode: GenerationMode;
  openSections: string[];
};

function resolveDefaultModel(value?: string): ImageModel {
  return (IMAGE_MODELS as readonly string[]).includes(value ?? "")
    ? (value as ImageModel)
    : DEFAULT_MODEL;
}

let cache: StoredSettings | null = null;

async function load(): Promise<StoredSettings> {
  if (cache) return cache;
  try {
    const raw = await readFile(join(configDir(), SETTINGS_FILE), "utf-8");
    const parsed = storedSettingsSchema.safeParse(JSON.parse(raw));
    cache = parsed.success ? parsed.data : {};
  } catch {
    // Treat a missing or unreadable file as empty settings.
    cache = {};
  }
  return cache;
}

async function persist(data: StoredSettings): Promise<void> {
  const dir = configDir();
  // The file holds the key, so protect it with dir 0700 / file 0600.
  await mkdir(dir, { recursive: true, mode: 0o700 });
  await chmod(dir, 0o700).catch(() => {});
  const file = join(dir, SETTINGS_FILE);
  await writeFile(file, JSON.stringify(data, null, 2), { mode: 0o600 });
  await chmod(file, 0o600).catch(() => {});
  cache = data;
}

/**
 * Stored settings filled in with defaults. apiKey is the stored value only,
 * without the env fallback.
 */
export async function getSettings(): Promise<ResolvedSettings> {
  const s = await load();
  return {
    apiKey: s.apiKey ?? null,
    outputDir: s.outputDir ?? defaultOutputDir(),
    defaultModel: resolveDefaultModel(s.defaultModel),
    // Default to "other": assuming Opus would under-report the cost, and an
    // estimate that is too low is worse than one that is too high.
    plan: s.plan ?? "other",
    // Default to "queue": the free path on Opus, so it never surprises the
    // user with an Anlas charge.
    generationMode: s.generationMode ?? "queue",
    // The scene list is what a batch run is built from, so it is the one
    // section worth opening before anything is asked for.
    openSections: s.openSections ?? ["template"],
  };
}

export type SettingsPatch = {
  apiKey?: string;
  outputDir?: string;
  defaultModel?: ImageModel;
  plan?: Plan;
  generationMode?: GenerationMode;
  openSections?: string[];
};

export async function updateSettings(
  patch: SettingsPatch
): Promise<ResolvedSettings> {
  const current = await load();
  const next: StoredSettings = { ...current };
  if (patch.apiKey !== undefined) next.apiKey = patch.apiKey;
  if (patch.outputDir !== undefined) next.outputDir = patch.outputDir;
  if (patch.defaultModel !== undefined) next.defaultModel = patch.defaultModel;
  if (patch.plan !== undefined) next.plan = patch.plan;
  if (patch.generationMode !== undefined) {
    next.generationMode = patch.generationMode;
  }
  if (patch.openSections !== undefined) next.openSections = patch.openSections;
  await persist(next);
  return getSettings();
}

export async function deleteApiKey(): Promise<void> {
  const current = await load();
  const next = { ...current };
  delete next.apiKey;
  await persist(next);
}

/** The effective API key: stored value, then the env fallback, then null. */
export async function getApiKey(): Promise<string | null> {
  const s = await load();
  return s.apiKey ?? env.NOVELAI_API_KEY ?? null;
}

/** Resolve the output directory, creating it if it does not exist. */
export async function getOutputDir(): Promise<string> {
  const { outputDir } = await getSettings();
  await mkdir(outputDir, { recursive: true });
  return outputDir;
}

/** Mask the key to just its last 4 characters, like `pst-****abcd`. */
export function maskApiKey(key: string): string {
  const last4 = key.slice(-4);
  const prefix = key.startsWith("pst-") ? "pst-" : "";
  return `${prefix}****${last4}`;
}

/** Build the public view without exposing the raw API key. */
export async function publicSettings(): Promise<SettingsView> {
  const [
    { outputDir, defaultModel, plan, generationMode, openSections },
    apiKey,
  ] = await Promise.all([getSettings(), getApiKey()]);
  return {
    hasApiKey: apiKey !== null,
    apiKeyPreview: apiKey ? maskApiKey(apiKey) : null,
    outputDir,
    defaultModel,
    plan,
    generationMode,
    openSections,
  };
}

async function toErrorMessage(error: unknown): Promise<string> {
  if (error instanceof Response) {
    try {
      const data = (await error.clone().json()) as { error?: string };
      if (data.error) return data.error;
    } catch {
      // If it is not JSON, build the message from the status.
    }
    return `NovelAI request failed with status ${error.status}`;
  }
  return error instanceof Error ? error.message : "Unknown error";
}

const NO_KEY_MESSAGE = "NovelAI API key is not configured";

const putBodySchema = z.object({
  apiKey: z.string().min(1).optional(),
  outputDir: z.string().min(1).optional(),
  defaultModel: z.enum(IMAGE_MODELS).optional(),
  plan: z.enum(["opus", "other"]).optional(),
  generationMode: z.enum(["queue", "alternate"]).optional(),
  /**
   * Which panel sections start expanded. Held as opaque strings: which
   * sections exist is the web app's business, and a second list of names here
   * would be one more place to keep in step.
   */
  openSections: z.array(z.string().min(1).max(40)).max(20).optional(),
});

const verifyBodySchema = z.object({
  apiKey: z.string().min(1).optional(),
});

export const settingsRouter = new Hono()
  .get("/", async (c) => c.json(await publicSettings()))
  .put("/", zValidator("json", putBodySchema, onInvalid), async (c) => {
    await updateSettings(c.req.valid("json"));
    return c.json(await publicSettings());
  })
  .delete("/api-key", async (c) => {
    await deleteApiKey();
    return c.json(await publicSettings());
  })
  .post(
    "/verify",
    zValidator("json", verifyBodySchema, onInvalid),
    async (c) => {
      const apiKey = c.req.valid("json").apiKey ?? (await getApiKey());
      if (!apiKey) return c.json({ error: NO_KEY_MESSAGE }, 428);
      try {
        const client = createNovelAIClient({
          apiKey,
          imageBase: env.NOVELAI_IMAGE_BASE,
          apiBase: env.NOVELAI_API_BASE,
        });
        const subscription = await client.subscription();
        return c.json({ ok: true, subscription });
      } catch (error) {
        return c.json({ ok: false, error: await toErrorMessage(error) });
      }
    }
  );
