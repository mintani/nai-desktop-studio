import "dotenv/config";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

/**
 * Server environment variables. The NovelAI API key is normally saved from the
 * in-app settings screen, so here it is only a development fallback (the server
 * starts even when it is unset).
 */
export const env = createEnv({
  server: {
    CORS_ORIGIN: z.url().default("http://localhost:3001"),
    PORT: z.coerce.number().int().default(3000),
    NOVELAI_API_KEY: z.string().min(1).optional(),
    NOVELAI_IMAGE_BASE: z.url().optional(),
    NOVELAI_API_BASE: z.url().optional(),
    /**
     * Where to save the settings file. Defaults to the XDG user config
     * directory.
     */
    NAI_CONFIG_DIR: z.string().min(1).optional(),
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .default("development"),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});
