/**
 * Helper that extracts the "tag currently being edited" from the caret position
 * in the text. Used to target only the token right before the caret for
 * completion, not the whole field.
 */

export type TagTokenInfo = {
  /**
   * Where the replacement starts within value (start of the search term, past
   * leading whitespace and the prefix).
   */
  queryStart: number;
  /**
   * Current token used for the completion search (the body, without `artist:`
   * or weight notation).
   */
  query: string;
  /**
   * Leading prefix that was detected (`artist:` or weight notation). Kept so it
   * can be preserved on replacement.
   */
  prefix: string;
};

/**
 * Treats the span from the delimiter right before `caret` (a `,` or newline) up
 * to `caret` as the current token. A leading `artist:` and NovelAI's weight
 * notation `1.5::` are stripped from the search term, but `queryStart` points at
 * the body's start so they can be kept on replacement.
 */
export function getCurrentTagToken(value: string, caret: number): TagTokenInfo {
  let start = caret;
  while (start > 0 && value[start - 1] !== "," && value[start - 1] !== "\n") {
    start--;
  }
  const before = value.slice(start, caret);
  const leadingWs = (before.match(/^\s*/)?.[0] ?? "").length;
  const afterWs = before.slice(leadingWs);
  const prefix = afterWs.match(/^(?:artist:)?(?:\d+(?:\.\d+)?::)?/)?.[0] ?? "";
  const queryStart = start + leadingWs + prefix.length;
  return { queryStart, query: value.slice(queryStart, caret), prefix };
}

export type BraceTokenInfo = {
  /** Where the `{` sits — the replacement starts here. */
  start: number;
  /** What has been typed since the `{`. */
  query: string;
};

/**
 * Returns the span of an unclosed `{` before the caret, or null if there is
 * none. `1girl, {char|` gives `{ start: 7, query: "char" }`.
 *
 * A template key names a slot, not a picture, so while one is being written the
 * Danbooru dictionary has nothing useful to say — this is what tells the two
 * kinds of completion apart.
 */
export function getCurrentBraceToken(
  value: string,
  caret: number
): BraceTokenInfo | null {
  for (let i = caret - 1; i >= 0; i--) {
    const char = value[i];
    if (char === "}" || char === "\n") return null;
    if (char === "{") {
      const query = value.slice(i + 1, caret);
      return /[{}]/.test(query) ? null : { start: i, query };
    }
  }
  return null;
}
