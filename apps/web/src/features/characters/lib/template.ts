/**
 * Character templates. A character is a set of named variables (hair colour,
 * eyes, clothes...) plus templates that reference them as `{key}`. The same
 * variables also fill a situation's templates, which is what lets one character
 * be dropped into any situation.
 */

export const DEFAULT_CHARACTER_VARIABLE_KEYS = [
  "character_tag",
  "hair_color",
  "eye",
  "breast_size",
  "accessory",
  "hair_ornament",
  "underwear",
  "shoes",
  "clothes_upper",
  "clothes_lower",
  "additional_prompt",
  "additionalcharacter",
  "additionalcharacter_negative",
] as const;

/**
 * The subject word NovelAI puts at the head of a character's caption.
 *
 * V4 needs each character caption to name a subject. A caption that is only
 * attributes — "ponytail, white hair, thighhighs" — gives the model nothing to
 * attach them to, so with several characters they smear into one figure. The
 * official app has the same three, and it is why they come first.
 */
export const CHARACTER_GENDERS = ["girl", "boy", "other"] as const;

export type CharacterGender = (typeof CHARACTER_GENDERS)[number];

export type CharacterVariable = {
  id: string;
  key: string;
  value: string;
};

export type Character = {
  id: string;
  name: string;
  groupName: string | null;
  /** Sample image shown on the card. An asset path, or null. */
  imagePath: string | null;
  /** Prepended to this character's caption. Null adds nothing. */
  gender: CharacterGender | null;
  positiveTemplate: string;
  negativeTemplate: string;
  variables: CharacterVariable[];
  negativePrompt: string;
  createdAt: string;
  updatedAt: string;
};

export const DEFAULT_POSITIVE_TEMPLATE =
  "{character_tag},{hair_color},{eye},{breast_size},{accessory},{hair_ornament},{underwear},{shoes},{clothes_upper},{clothes_lower},{additional_prompt}";

export const DEFAULT_NEGATIVE_TEMPLATE = "{negative_prompt}";

function createVariable(key = "", value = ""): CharacterVariable {
  return { id: crypto.randomUUID(), key, value };
}

export function createDefaultVariables(): CharacterVariable[] {
  return DEFAULT_CHARACTER_VARIABLE_KEYS.map((key) => createVariable(key));
}

export function createEmptyVariable() {
  return createVariable();
}

export function createEmptyCharacter(name: string): Character {
  const now = new Date().toISOString();

  return {
    id: crypto.randomUUID(),
    name,
    groupName: null,
    imagePath: null,
    gender: null,
    positiveTemplate: DEFAULT_POSITIVE_TEMPLATE,
    negativeTemplate: DEFAULT_NEGATIVE_TEMPLATE,
    variables: createDefaultVariables(),
    negativePrompt: "",
    createdAt: now,
    updatedAt: now,
  };
}

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

export function variablesToRecord(variables: CharacterVariable[]) {
  return Object.fromEntries(
    variables.map((variable) => [variable.key.trim(), variable.value])
  );
}

/**
 * Replaces `{key}` with its value, then tidies the comma-separated result.
 * Unknown or empty keys collapse away, so a half-filled character still yields a
 * clean prompt instead of stray commas.
 */
export function renderPromptTemplate(
  template: string,
  values: Record<string, string>
) {
  const replaced = template.replace(
    /\{([^}]+)\}/g,
    (_, key: string) => values[key]?.trim() ?? ""
  );

  return replaced
    .split(",")
    .map((part) => normalizeWhitespace(part))
    .filter(Boolean)
    .join(", ");
}

export function buildCharacterPositivePrompt(character: Character) {
  return renderPromptTemplate(
    character.positiveTemplate,
    variablesToRecord(character.variables)
  );
}

export function buildCharacterNegativePrompt(character: Character) {
  return renderPromptTemplate(character.negativeTemplate, {
    negative_prompt: character.negativePrompt,
  });
}

export function searchableCharacterText(character: Character) {
  return [
    character.name,
    character.groupName ?? "",
    character.gender ?? "",
    character.positiveTemplate,
    character.negativeTemplate,
    character.negativePrompt,
    ...character.variables.flatMap((variable) => [
      variable.key,
      variable.value,
    ]),
  ]
    .join(" ")
    .toLowerCase();
}

function readString(input: object, key: string): string | undefined {
  const value: unknown = Reflect.get(input, key);
  return typeof value === "string" ? value : undefined;
}

/**
 * Rebuilds a character from whatever the store returned. Records are written by
 * older versions of this app and are not re-validated server-side, so every
 * field falls back to a usable default rather than throwing.
 */
export function normalizeCharacter(input: unknown, fallbackName: string) {
  const base = createEmptyCharacter(fallbackName);

  if (!input || typeof input !== "object") return base;

  const rawVariables: unknown = Reflect.get(input, "variables");
  const variables =
    Array.isArray(rawVariables) && rawVariables.length > 0
      ? rawVariables.map((variable: unknown) => {
          if (!variable || typeof variable !== "object") {
            return createVariable();
          }
          const id = readString(variable, "id");
          return {
            id: id && id.length > 0 ? id : crypto.randomUUID(),
            key: readString(variable, "key") ?? "",
            value: readString(variable, "value") ?? "",
          };
        })
      : base.variables;

  const id = readString(input, "id");
  const name = readString(input, "name");
  const groupName = readString(input, "groupName");
  const imagePath = readString(input, "imagePath");
  const gender = readString(input, "gender");
  const positiveTemplate = readString(input, "positiveTemplate");
  const negativeTemplate = readString(input, "negativeTemplate");
  const negativePrompt = readString(input, "negativePrompt");
  const createdAt = readString(input, "createdAt");
  const updatedAt = readString(input, "updatedAt");

  return {
    id: id && id.length > 0 ? id : base.id,
    name: name && name.trim().length > 0 ? name.trim() : base.name,
    groupName:
      groupName && groupName.trim().length > 0 ? groupName.trim() : null,
    imagePath: imagePath && imagePath.length > 0 ? imagePath : null,
    gender: CHARACTER_GENDERS.find((item) => item === gender) ?? null,
    positiveTemplate:
      positiveTemplate && positiveTemplate.trim().length > 0
        ? positiveTemplate
        : base.positiveTemplate,
    negativeTemplate:
      negativeTemplate && negativeTemplate.trim().length > 0
        ? negativeTemplate
        : base.negativeTemplate,
    variables,
    negativePrompt: negativePrompt ?? base.negativePrompt,
    createdAt: createdAt && createdAt.length > 0 ? createdAt : base.createdAt,
    updatedAt: updatedAt && updatedAt.length > 0 ? updatedAt : base.updatedAt,
  } satisfies Character;
}
