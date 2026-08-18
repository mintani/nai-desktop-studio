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

export const env = {
  VITE_SERVER_URL: required(
    "VITE_SERVER_URL",
    import.meta.env.VITE_SERVER_URL as string | undefined
  ),
};
