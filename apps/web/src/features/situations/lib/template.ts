import {
  renderPromptTemplate,
  variablesToRecord,
  type CharacterVariable,
} from "@/features/characters/lib/template";

/**
 * A situation carries four templates. NovelAI V4 needs the scene and the
 * character described separately — the scene goes to base_caption and the
 * character to characters[].char_caption — so they are never merged here.
 */
export const SITUATION_TARGETS = [
  "basePrompt",
  "baseNegative",
  "characterPrompt",
  "characterNegativePrompt",
] as const;

export type SituationTarget = (typeof SITUATION_TARGETS)[number];

export type SituationVariableKey = {
  id: string;
  key: string;
  target: SituationTarget;
};

export type Situation = {
  id: string;
  name: string;
  groupName: string | null;
  variableKeys: SituationVariableKey[];
  basePrompt: string;
  baseNegative: string;
  characterPrompt: string;
  characterNegativePrompt: string;
  createdAt: string;
  updatedAt: string;
};

/** Character tokens inserted into a new situation. Each can be removed later. */
export const DEFAULT_SITUATION_CHARACTER_KEYS = [
  "copyright_tag",
  "character_tag",
  "hair_style",
  "hair_color",
  "hair_ornament",
  "breast_size",
  "clothes_upper",
  "clothes_lower",
  "hand",
  "foot",
] as const;

/**
 * Append-only slots kept in every field. They exist so a character can always
 * add something to a situation it does not otherwise cover, which is why they
 * cannot be removed.
 */
export const INTERNAL_SITUATION_KEYS: Array<{
  key: string;
  target: SituationTarget;
}> = [
  { key: "additional", target: "basePrompt" },
  { key: "additional_negative", target: "baseNegative" },
  { key: "additionalcharacter", target: "characterPrompt" },
  { key: "additionalcharacter_negative", target: "characterNegativePrompt" },
];

export const INTERNAL_SITUATION_KEY_NAMES = INTERNAL_SITUATION_KEYS.map(
  (entry) => entry.key
);

function createVariableKey(
  key = "",
  target: SituationTarget = "characterPrompt"
): SituationVariableKey {
  return { id: crypto.randomUUID(), key, target };
}

function isSituationTarget(value: unknown): value is SituationTarget {
  return (
    typeof value === "string" && SITUATION_TARGETS.some((t) => t === value)
  );
}

export function createSituationToken(key: string) {
  const trimmed = key.trim();
  return trimmed ? `{${trimmed}}` : "";
}

export function extractSituationTokens(template: string) {
  const seen = new Set<string>();
  const tokens: string[] = [];

  // `[^{}]` rather than `[^}]`: a key never contains a brace, and allowing one
  // would let a half-typed `{` reach across and eat the next real token —
  // `{, {additional}` would read as one key named `, {additional`.
  for (const match of template.matchAll(/\{([^{}]+)\}/g)) {
    const key = match[1]?.trim() ?? "";
    if (!key || seen.has(key)) continue;
    seen.add(key);
    tokens.push(key);
  }

  return tokens;
}

function splitPromptParts(value: string) {
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

export function appendSituationToken(template: string, key: string) {
  const trimmed = key.trim();
  if (!trimmed) return template;

  const token = createSituationToken(trimmed);
  const parts = splitPromptParts(template);
  if (parts.includes(token)) return parts.join(", ");

  return [...parts, token].join(", ");
}

export function removeSituationToken(template: string, key: string) {
  const trimmed = key.trim();
  if (!trimmed) return splitPromptParts(template).join(", ");

  const token = createSituationToken(trimmed);
  return splitPromptParts(template)
    .filter((part) => part !== token)
    .join(", ");
}

export function isInternalSituationKey(key: string, target: SituationTarget) {
  return INTERNAL_SITUATION_KEYS.some(
    (entry) => entry.key === key.trim() && entry.target === target
  );
}

export function isDefaultSituationCharacterKey(
  key: string,
  target: SituationTarget
) {
  return (
    target === "characterPrompt" &&
    DEFAULT_SITUATION_CHARACTER_KEYS.some((k) => k === key.trim())
  );
}

/**
 * A token the editor puts on the field's chip row instead of in its text. These
 * are the ones the app inserts by itself — the append-only slots and the
 * character presets — so leaving them in the box would fill it with text nobody
 * typed.
 */
export function isManagedSituationKey(key: string, target: SituationTarget) {
  return (
    isInternalSituationKey(key, target) ||
    isDefaultSituationCharacterKey(key, target)
  );
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function emptyByTarget<T>(make: () => T): Record<SituationTarget, T> {
  return {
    basePrompt: make(),
    baseNegative: make(),
    characterPrompt: make(),
    characterNegativePrompt: make(),
  };
}

/**
 * The tokens the chip row owns in each field, as literal `{key}` strings.
 *
 * The two functions below search for these exact strings instead of parsing the
 * text for tokens. Parsing is not safe here: the text box is where a token gets
 * typed, so it spends a keystroke or two holding an unfinished `{`, and a parser
 * asked about that moment gives an answer that would take a real token with it.
 * The closing brace makes plain substring matching exact — `{additional}` is not
 * a substring of `{additional_negative}` or `{additionalcharacter}`.
 */
const MANAGED_TOKENS: Record<SituationTarget, string[]> = emptyByTarget(
  (): string[] => []
);
MANAGED_TOKENS.characterPrompt.push(
  ...DEFAULT_SITUATION_CHARACTER_KEYS.map((key) => createSituationToken(key))
);
for (const entry of INTERNAL_SITUATION_KEYS) {
  MANAGED_TOKENS[entry.target].push(createSituationToken(entry.key));
}

/** Per token, in order: after a comma, before a comma, on its own. */
const MANAGED_TOKEN_PATTERNS: Record<SituationTarget, RegExp[]> = emptyByTarget(
  (): RegExp[] => []
);
for (const target of SITUATION_TARGETS) {
  for (const token of MANAGED_TOKENS[target]) {
    const escaped = escapeRegExp(token);
    MANAGED_TOKEN_PATTERNS[target].push(
      new RegExp(`,[ \\t]*${escaped}`, "g"),
      new RegExp(`${escaped}[ \\t]*,[ \\t]*`, "g"),
      new RegExp(escaped, "g")
    );
  }
}

/**
 * What the text box shows: the field minus everything the chips already cover.
 *
 * The tokens are cut out with a regular expression rather than by splitting on
 * commas and rejoining. Rejoining would tidy the free text on every keystroke,
 * and a comma the moment it is typed is an empty part — so it would be swallowed
 * and no second tag could ever be started. Only the separator next to a token is
 * taken; the rest of the text comes back exactly as it was typed.
 */
export function stripManagedSituationTokens(
  template: string,
  target: SituationTarget
) {
  let text = template;
  for (const pattern of MANAGED_TOKEN_PATTERNS[target]) {
    text = text.replace(pattern, "");
  }
  return text;
}

/**
 * Puts the chip-managed tokens back behind freely typed text. The text box only
 * ever holds the stripped half, so every edit has to rebuild the whole field or
 * the presets would disappear the moment someone types.
 *
 * The free text is kept verbatim — a stray comma left mid-edit is tidied by
 * {@link syncSituationVariableKeys} on blur, which is late enough not to fight
 * the person typing.
 */
export function mergeManagedSituationTokens(
  freeText: string,
  template: string,
  target: SituationTarget
) {
  const suffix = MANAGED_TOKENS[target]
    .filter((token) => template.includes(token))
    .sort((a, b) => template.indexOf(a) - template.indexOf(b))
    .join(", ");

  if (!suffix) return freeText;
  return freeText.trim() ? `${freeText}, ${suffix}` : suffix;
}

/**
 * The character variable keys these situations ask for, in first-seen order.
 *
 * This is what a character actually has to fill in: generation renders the
 * situation's templates against the character's variables, so a value whose key
 * no situation mentions never reaches an image. The append-only slots are left
 * out because every situation carries them — the character editor pins those
 * rather than repeating them here.
 */
export function collectSituationVariableKeys(
  situations: readonly Situation[]
): string[] {
  const seen = new Set<string>(INTERNAL_SITUATION_KEY_NAMES);
  const keys: string[] = [];

  for (const situation of situations) {
    for (const target of SITUATION_TARGETS) {
      for (const key of extractSituationTokens(situation[target])) {
        if (seen.has(key)) continue;
        seen.add(key);
        keys.push(key);
      }
    }
  }

  return keys;
}

/** Moves the append-only slots to the end of their field, adding any that are missing. */
function ensureInternalTokens(situation: Situation): Situation {
  let next = situation;

  for (const entry of INTERNAL_SITUATION_KEYS) {
    next = {
      ...next,
      [entry.target]: removeSituationToken(next[entry.target], entry.key),
    };
  }
  for (const entry of INTERNAL_SITUATION_KEYS) {
    next = {
      ...next,
      [entry.target]: appendSituationToken(next[entry.target], entry.key),
    };
  }

  return next;
}

/** Rebuilds variableKeys from the tokens actually present in the four fields. */
export function syncSituationVariableKeys(situation: Situation): Situation {
  const normalized = ensureInternalTokens(situation);
  const ordered: Array<{ key: string; target: SituationTarget }> = [];

  for (const target of SITUATION_TARGETS) {
    for (const key of extractSituationTokens(normalized[target])) {
      ordered.push({ key, target });
    }
  }

  return {
    ...normalized,
    variableKeys: ordered.map(({ key, target }) => {
      const existing = normalized.variableKeys.find(
        (entry) => entry.key.trim() === key && entry.target === target
      );
      return { id: existing?.id ?? crypto.randomUUID(), key, target };
    }),
  };
}

export function createEmptySituation(name: string): Situation {
  const now = new Date().toISOString();

  return syncSituationVariableKeys({
    id: crypto.randomUUID(),
    name,
    groupName: null,
    variableKeys: [],
    basePrompt: "",
    // The negative preset already carries lowres and friends, so a new
    // situation starts empty instead of repeating one of them.
    baseNegative: "",
    characterPrompt: DEFAULT_SITUATION_CHARACTER_KEYS.map((key) =>
      createSituationToken(key)
    ).join(", "),
    characterNegativePrompt: "",
    createdAt: now,
    updatedAt: now,
  });
}

export function searchableSituationText(situation: Situation) {
  return [
    situation.name,
    situation.groupName ?? "",
    situation.basePrompt,
    situation.baseNegative,
    situation.characterPrompt,
    situation.characterNegativePrompt,
    ...situation.variableKeys.flatMap((entry) => [entry.key, entry.target]),
  ]
    .join(" ")
    .toLowerCase();
}

function readString(input: object, key: string): string | undefined {
  const value: unknown = Reflect.get(input, key);
  return typeof value === "string" ? value : undefined;
}

export function normalizeSituation(input: unknown, fallbackName: string) {
  const base = createEmptySituation(fallbackName);

  if (!input || typeof input !== "object") return base;

  const rawVariableKeys: unknown = Reflect.get(input, "variableKeys");
  const id = readString(input, "id");
  const name = readString(input, "name");
  const groupName = readString(input, "groupName");
  const createdAt = readString(input, "createdAt");
  const updatedAt = readString(input, "updatedAt");

  const normalized: Situation = {
    id: id && id.length > 0 ? id : base.id,
    name: name && name.trim().length > 0 ? name.trim() : base.name,
    groupName:
      groupName && groupName.trim().length > 0 ? groupName.trim() : null,
    variableKeys: Array.isArray(rawVariableKeys)
      ? rawVariableKeys
          .map((entry: unknown) => {
            if (typeof entry === "string" && entry.trim().length > 0) {
              return createVariableKey(entry, "characterPrompt");
            }
            if (!entry || typeof entry !== "object") return null;

            const key = readString(entry, "key")?.trim() ?? "";
            if (!key) return null;

            const entryId = readString(entry, "id");
            const target: unknown = Reflect.get(entry, "target");
            return {
              id: entryId && entryId.length > 0 ? entryId : crypto.randomUUID(),
              key,
              target: isSituationTarget(target) ? target : "characterPrompt",
            };
          })
          .filter((entry): entry is SituationVariableKey => entry !== null)
      : base.variableKeys,
    basePrompt: readString(input, "basePrompt") ?? base.basePrompt,
    baseNegative: readString(input, "baseNegative") ?? base.baseNegative,
    characterPrompt:
      readString(input, "characterPrompt") ?? base.characterPrompt,
    characterNegativePrompt:
      readString(input, "characterNegativePrompt") ??
      base.characterNegativePrompt,
    createdAt: createdAt && createdAt.length > 0 ? createdAt : base.createdAt,
    updatedAt: updatedAt && updatedAt.length > 0 ? updatedAt : base.updatedAt,
  };

  return syncSituationVariableKeys(normalized);
}

export function buildSituationBasePrompt(
  situation: Situation,
  variables: CharacterVariable[]
) {
  return renderPromptTemplate(
    situation.basePrompt,
    variablesToRecord(variables)
  );
}

export function buildSituationBaseNegativePrompt(
  situation: Situation,
  variables: CharacterVariable[]
) {
  return renderPromptTemplate(
    situation.baseNegative,
    variablesToRecord(variables)
  );
}

export function buildSituationCharacterPrompt(
  situation: Situation,
  variables: CharacterVariable[]
) {
  return renderPromptTemplate(
    situation.characterPrompt,
    variablesToRecord(variables)
  );
}

export function buildSituationCharacterNegativePrompt(
  situation: Situation,
  variables: CharacterVariable[]
) {
  return renderPromptTemplate(
    situation.characterNegativePrompt,
    variablesToRecord(variables)
  );
}
