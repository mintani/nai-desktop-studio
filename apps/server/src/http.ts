import type { Context } from "hono";

/**
 * How a request that fails validation is answered.
 *
 * Every other failure in this API is `{ error: "<one sentence>" }` and the
 * browser client reads exactly that field, so validation answers the same way
 * instead of in the validator's own shape. Only the first problem is reported:
 * the caller is this app's own UI, and a list of issues would be read by
 * nobody.
 */
export function onInvalid(
  result:
    | { success: true }
    | { success: false; error: { issues: ReadonlyArray<{ message: string }> } },
  c: Context
) {
  if (result.success) return;
  const first = result.error.issues[0];
  return c.json({ error: first?.message ?? "Invalid request" }, 400);
}
