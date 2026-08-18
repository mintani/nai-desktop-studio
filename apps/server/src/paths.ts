import { homedir } from "node:os";
import { join } from "node:path";
import { env } from "@nai-desktop-studio/env/server";

/**
 * Resolve the config directory.
 * $NAI_CONFIG_DIR, then $XDG_CONFIG_HOME/nai-desktop-studio, then
 * ~/.config/nai-desktop-studio.
 */
export function configDir(): string {
  if (env.NAI_CONFIG_DIR) return env.NAI_CONFIG_DIR;
  const xdg = process.env.XDG_CONFIG_HOME;
  if (xdg) return join(xdg, "nai-desktop-studio");
  return join(homedir(), ".config", "nai-desktop-studio");
}

export function defaultOutputDir(): string {
  return join(homedir(), "Pictures", "nai-desktop-studio");
}
