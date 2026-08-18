/**
 * Browser environment. Vite inlines `import.meta.env` at build time, so what
 * reaches the browser is a literal string, not a lookup.
 *
 * Deliberately without zod. The server side validates because its values come
 * from a machine at run time and a wrong one should stop the process; this side
 * has exactly one value, fixed when the bundle is built. Validating it in the
 * browser was costing 282 KB — a quarter of the bundle — to check a string that
 * cannot change after the build.
 */
function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `${name} is not set. Copy apps/web/.env.example to apps/web/.env.`
    );
  }
  return value;
}

/**
 * The address the desktop build was given as the page loaded.
 *
 * There it cannot be fixed at build time: the local server takes a port the
 * operating system hands out when the app starts, and the app is built long
 * before that. The Tauri shell sets this on the window before any of the
 * page's own scripts run. In a browser nothing sets it and the build-time
 * value stands, so this file is the only place that knows the difference.
 */
function injected(): string | undefined {
  const scope = globalThis as typeof globalThis & {
    __NAI_SERVER_URL__?: unknown;
  };
  const value = scope.__NAI_SERVER_URL__;
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

export const env = {
  VITE_SERVER_URL:
    injected() ??
    required(
      "VITE_SERVER_URL",
      import.meta.env.VITE_SERVER_URL as string | undefined
    ),
};
