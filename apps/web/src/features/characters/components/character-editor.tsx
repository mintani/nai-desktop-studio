"use client";

import { Button } from "@nai-desktop-studio/ui/components/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@nai-desktop-studio/ui/components/collapsible";
import { Input } from "@nai-desktop-studio/ui/components/input";
import { Label } from "@nai-desktop-studio/ui/components/label";
import { ScrollArea } from "@nai-desktop-studio/ui/components/scroll-area";
import { Textarea } from "@nai-desktop-studio/ui/components/textarea";
import { cn } from "@nai-desktop-studio/ui/lib/utils";
import { Asterisk, ChevronDown, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

import { GroupField } from "@/components/group-field";
import { SegmentedControl } from "@/components/segmented-control";
import { TagAutocompleteTextarea } from "@/components/tag-autocomplete/tag-autocomplete-textarea";
import { useSituations } from "@/features/situations/hooks/queries";
import {
  collectSituationVariableKeys,
  INTERNAL_SITUATION_KEYS,
  type Situation,
  type SituationTarget,
} from "@/features/situations/lib/template";
import type { MessageKey } from "@/i18n/messages";
import { useT } from "@/i18n/provider";

import {
  buildCharacterNegativePrompt,
  buildCharacterPositivePrompt,
  CHARACTER_GENDERS,
  createEmptyVariable,
  DEFAULT_CHARACTER_VARIABLE_KEYS,
  type Character,
  type CharacterGender,
  type CharacterVariable,
} from "../lib/template";
import { CharacterImageField } from "./character-image-field";

/**
 * The append-only slots, the two character ones first — those are the pair a
 * character normally fills. Derived from the situation's own list so a slot
 * added there can never go missing here.
 */
const SLOT_TARGET_ORDER: SituationTarget[] = [
  "characterPrompt",
  "characterNegativePrompt",
  "basePrompt",
  "baseNegative",
];
const SLOTS = SLOT_TARGET_ORDER.flatMap((target) =>
  INTERNAL_SITUATION_KEYS.filter((entry) => entry.target === target)
);
const SLOT_KEYS = new Set(SLOTS.map((entry) => entry.key));

const NO_GENDER = "__none__";

const GENDER_LABEL_KEYS: Record<CharacterGender, MessageKey> = {
  girl: "characters.genderGirl",
  boy: "characters.genderBoy",
  other: "characters.genderOther",
};

/** Keys a new character is seeded with. An untouched one is not worth showing. */
const SEEDED_KEYS = new Set<string>(DEFAULT_CHARACTER_VARIABLE_KEYS);

/** Groups situations by name, keeping the ungrouped bucket last. */
function groupSituations(situations: Situation[], ungroupedLabel: string) {
  const keys = new Map<string, string>();
  for (const situation of situations) {
    const key = situation.groupName ?? "";
    keys.set(key, key || ungroupedLabel);
  }
  return [...keys.entries()]
    .sort(([a], [b]) => {
      if (!a) return 1;
      if (!b) return -1;
      return a.localeCompare(b, "ja");
    })
    .map(([key, label]) => ({ key, label }));
}

type Props = {
  character: Character;
  /** Group names the character collection already uses. */
  groupOptions: readonly string[];
  onChange: (next: Character) => void;
};

/** One value the situations do not ask for: its key is editable and removable. */
function ExtraRow({
  variable,
  onKeyChange,
  onValueChange,
  onRemove,
}: {
  variable: CharacterVariable;
  onKeyChange: (key: string) => void;
  onValueChange: (value: string) => void;
  onRemove: () => void;
}) {
  const t = useT();

  return (
    <div className="flex items-start gap-2">
      <Input
        value={variable.key}
        onChange={(event) => onKeyChange(event.target.value)}
        placeholder={t("characters.variableKeyPlaceholder")}
        spellCheck={false}
        autoComplete="off"
        className="h-7 w-32 shrink-0 font-mono text-[11px]"
      />
      <div className="min-w-0 flex-1">
        <TagAutocompleteTextarea
          id={`character-extra-${variable.id}`}
          rows={1}
          value={variable.value}
          onChange={onValueChange}
          placeholder={t("characters.valuePlaceholder")}
          className="min-h-7 py-1.5 font-mono text-[11px]"
        />
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="text-muted-foreground hover:text-destructive shrink-0"
        title={t("action.delete")}
        onClick={onRemove}
      >
        <Trash2 />
        <span className="sr-only">{t("action.delete")}</span>
      </Button>
    </div>
  );
}

/**
 * Editor for one character.
 *
 * The fields are projected from the situations rather than fixed, because a
 * character's values only ever reach an image through a situation's templates —
 * generation renders those templates against these values and ignores the
 * character's own. A hardcoded list therefore asks for tags nothing uses and
 * stays silent about the ones a situation does need.
 */
export function CharacterEditor({ character, groupOptions, onChange }: Props) {
  const t = useT();
  const { situations } = useSituations();
  const [ownPromptOpen, setOwnPromptOpen] = useState(false);
  const [extraOpen, setExtraOpen] = useState(false);
  const [groupFilter, setGroupFilter] = useState<ReadonlySet<string>>(
    () => new Set()
  );

  function patch(next: Partial<Character>) {
    onChange({ ...character, ...next });
  }

  const groups = useMemo(
    () => groupSituations(situations, t("group.none")),
    [situations, t]
  );

  // A group can disappear while its key is still in the filter, and an empty
  // filter means "all", so both collapse to the same thing: no live key
  // selected shows every situation rather than an empty editor.
  const activeGroups = useMemo(() => {
    const live = new Set(groups.map((group) => group.key));
    return new Set([...groupFilter].filter((key) => live.has(key)));
  }, [groups, groupFilter]);

  const referenced = useMemo(
    () =>
      activeGroups.size === 0
        ? situations
        : situations.filter((item) => activeGroups.has(item.groupName ?? "")),
    [situations, activeGroups]
  );

  const keys = useMemo(
    () => collectSituationVariableKeys(referenced),
    [referenced]
  );

  // Whether a value is stranded is judged against every situation, not the
  // filtered view: narrowing the view is a way of looking, not a verdict.
  const askedAnywhere = useMemo(
    () => new Set(collectSituationVariableKeys(situations)),
    [situations]
  );

  const valueByKey = useMemo(() => {
    const map = new Map<string, string>();
    for (const variable of character.variables) {
      map.set(variable.key.trim(), variable.value);
    }
    return map;
  }, [character.variables]);

  const extras = useMemo(
    () =>
      character.variables.filter((variable) => {
        const key = variable.key.trim();
        if (key && (askedAnywhere.has(key) || SLOT_KEYS.has(key))) return false;
        // A seeded key nobody ever filled in is noise, not a stranded value.
        return variable.value.trim().length > 0 || !SEEDED_KEYS.has(key);
      }),
    [character.variables, askedAnywhere]
  );

  function setValue(key: string, value: string) {
    const exists = character.variables.some(
      (variable) => variable.key.trim() === key
    );
    patch({
      variables: exists
        ? character.variables.map((variable) =>
            variable.key.trim() === key ? { ...variable, value } : variable
          )
        : [...character.variables, { id: crypto.randomUUID(), key, value }],
    });
  }

  function updateVariable(id: string, next: Partial<CharacterVariable>) {
    patch({
      variables: character.variables.map((variable) =>
        variable.id === id ? { ...variable, ...next } : variable
      ),
    });
  }

  function toggleGroup(key: string) {
    setGroupFilter((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const positivePreview = buildCharacterPositivePrompt(character);
  const negativePreview = buildCharacterNegativePrompt(character);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-start gap-3 border-b p-3">
        <CharacterImageField
          imagePath={character.imagePath}
          onChange={(imagePath) => patch({ imagePath })}
        />
        <div className="grid min-w-0 flex-1 gap-3">
          <div className="space-y-1">
            <Label htmlFor={`character-name-${character.id}`}>
              {t("characters.name")}
            </Label>
            <Input
              id={`character-name-${character.id}`}
              value={character.name}
              onChange={(event) => patch({ name: event.target.value })}
              placeholder={t("characters.namePlaceholder")}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`character-group-${character.id}`}>
              {t("group.label")}
            </Label>
            <GroupField
              id={`character-group-${character.id}`}
              value={character.groupName}
              options={groupOptions}
              onChange={(groupName) => patch({ groupName })}
            />
          </div>
          {/* Goes to the head of this character's caption. Without a subject
              word a caption of attributes has nothing to attach to, and two
              characters land on one body. */}
          <div className="space-y-1">
            <Label>{t("characters.gender")}</Label>
            <SegmentedControl
              label={t("characters.gender")}
              value={character.gender ?? NO_GENDER}
              options={[
                { value: NO_GENDER, label: t("characters.genderNone") },
                ...CHARACTER_GENDERS.map((value) => ({
                  value,
                  label: t(GENDER_LABEL_KEYS[value]),
                })),
              ]}
              onChange={(value) =>
                patch({
                  gender:
                    value === NO_GENDER ? null : (value as CharacterGender),
                })
              }
            />
            <p className="text-muted-foreground/80 text-[10px] leading-relaxed">
              {t("characters.genderHint")}
            </p>
          </div>
        </div>
      </div>

      {situations.length > 0 && (
        <div className="flex shrink-0 flex-wrap items-center gap-1.5 border-b px-3 py-2">
          <span className="text-muted-foreground mr-0.5 shrink-0 text-[10px] font-medium tracking-wide uppercase">
            {t("characters.reference")}
          </span>
          {groups.length > 1 ? (
            <>
              <Button
                type="button"
                size="sm"
                variant={activeGroups.size === 0 ? "secondary" : "outline"}
                aria-pressed={activeGroups.size === 0}
                onClick={() => setGroupFilter(new Set())}
                className={cn(activeGroups.size === 0 && "border-primary")}
              >
                {t("characters.referenceAll")}
              </Button>
              {groups.map((group) => {
                const on = activeGroups.has(group.key);
                return (
                  <Button
                    key={group.key}
                    type="button"
                    size="sm"
                    variant={on ? "secondary" : "outline"}
                    aria-pressed={on}
                    onClick={() => toggleGroup(group.key)}
                    className={cn("max-w-40", on && "border-primary")}
                  >
                    <span className="truncate">{group.label}</span>
                  </Button>
                );
              })}
            </>
          ) : (
            <span className="text-[11px]">
              {groups[0]?.label ?? t("characters.referenceAll")}
            </span>
          )}
          <span className="text-muted-foreground/70 ml-auto shrink-0 font-mono text-[10px] tabular-nums">
            {t("characters.fieldCount", { count: keys.length })}
          </span>
        </div>
      )}

      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-4 p-3">
          {keys.length === 0 ? (
            <p className="text-muted-foreground rounded-md border border-dashed p-4 text-center text-xs leading-relaxed">
              {situations.length === 0
                ? t("characters.noSituations")
                : t("characters.noFields")}
            </p>
          ) : (
            <div className="space-y-2">
              {keys.map((key) => (
                <div key={key} className="flex items-start gap-2">
                  <label
                    htmlFor={`character-value-${key}`}
                    title={key}
                    className="text-muted-foreground w-32 shrink-0 truncate pt-2 font-mono text-[11px]"
                  >
                    {`{${key}}`}
                  </label>
                  <div className="min-w-0 flex-1">
                    <TagAutocompleteTextarea
                      id={`character-value-${key}`}
                      rows={1}
                      value={valueByKey.get(key) ?? ""}
                      onChange={(value) => setValue(key, value)}
                      placeholder={t("characters.valuePlaceholder")}
                      className="min-h-7 py-1.5 font-mono text-[11px]"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Dashed edge and the asterisk, the same way the situation editor
              marks these slots. They are the one thing a character can always
              add, whatever the situation says. */}
          <section className="space-y-2 rounded-md border border-dashed p-2.5">
            <div className="flex items-center gap-1">
              <Asterisk className="text-muted-foreground size-3" aria-hidden />
              <h3 className="text-xs font-medium">{t("characters.slots")}</h3>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {SLOTS.map((slot) => (
                <div key={slot.key} className="space-y-1">
                  <label
                    htmlFor={`character-slot-${slot.key}`}
                    title={slot.key}
                    className="text-muted-foreground block truncate font-mono text-[10px]"
                  >
                    {`{${slot.key}}`}
                  </label>
                  <TagAutocompleteTextarea
                    id={`character-slot-${slot.key}`}
                    rows={2}
                    value={valueByKey.get(slot.key) ?? ""}
                    onChange={(value) => setValue(slot.key, value)}
                    placeholder={t("characters.valuePlaceholder")}
                    className="min-h-12 font-mono text-[11px]"
                  />
                </div>
              ))}
            </div>
            <p className="text-muted-foreground/80 text-[10px] leading-relaxed">
              {t("characters.slotsHint")}
            </p>
          </section>

          <Collapsible open={extraOpen} onOpenChange={setExtraOpen}>
            <CollapsibleTrigger className="font-display flex w-full items-center gap-1.5 py-1.5 text-left">
              <span className="text-xs font-medium">
                {t("characters.unused")}
              </span>
              <span className="text-muted-foreground/70 font-mono text-[10px] tabular-nums">
                {extras.length}
              </span>
              <ChevronDown
                className={cn(
                  "text-muted-foreground ml-auto size-4 transition-transform duration-150 ease-out",
                  extraOpen && "rotate-180"
                )}
                aria-hidden
              />
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-2 pt-1">
              <p className="text-muted-foreground/80 text-[10px] leading-relaxed">
                {t("characters.unusedHint")}
              </p>
              {extras.map((variable) => (
                <ExtraRow
                  key={variable.id}
                  variable={variable}
                  onKeyChange={(key) => updateVariable(variable.id, { key })}
                  onValueChange={(value) =>
                    updateVariable(variable.id, { value })
                  }
                  onRemove={() =>
                    patch({
                      variables: character.variables.filter(
                        (item) => item.id !== variable.id
                      ),
                    })
                  }
                />
              ))}
              <Button
                type="button"
                variant="outline"
                size="xs"
                onClick={() =>
                  patch({
                    variables: [...character.variables, createEmptyVariable()],
                  })
                }
              >
                <Plus />
                {t("characters.addVariable")}
              </Button>
            </CollapsibleContent>
          </Collapsible>

          <Collapsible open={ownPromptOpen} onOpenChange={setOwnPromptOpen}>
            <CollapsibleTrigger className="font-display flex w-full items-center justify-between py-1.5 text-left">
              <span className="text-xs font-medium">
                {t("characters.ownPrompt")}
              </span>
              <ChevronDown
                className={cn(
                  "text-muted-foreground size-4 transition-transform duration-150 ease-out",
                  ownPromptOpen && "rotate-180"
                )}
                aria-hidden
              />
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-3 pt-2">
              <p className="text-muted-foreground/80 text-[10px] leading-relaxed">
                {t("characters.ownPromptHint")}
              </p>
              <div className="space-y-1.5">
                <Label htmlFor={`character-negative-${character.id}`}>
                  {t("characters.negativePrompt")}
                </Label>
                <TagAutocompleteTextarea
                  id={`character-negative-${character.id}`}
                  rows={2}
                  value={character.negativePrompt}
                  onChange={(value) => patch({ negativePrompt: value })}
                  placeholder={t("characters.negativePlaceholder")}
                  className="font-mono text-[11px]"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`character-positive-template-${character.id}`}>
                  {t("characters.positiveTemplate")}
                </Label>
                <Textarea
                  id={`character-positive-template-${character.id}`}
                  rows={2}
                  value={character.positiveTemplate}
                  onChange={(event) =>
                    patch({ positiveTemplate: event.target.value })
                  }
                  spellCheck={false}
                  className="min-h-16 font-mono text-[11px]"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`character-negative-template-${character.id}`}>
                  {t("characters.negativeTemplate")}
                </Label>
                <Textarea
                  id={`character-negative-template-${character.id}`}
                  rows={2}
                  value={character.negativeTemplate}
                  onChange={(event) =>
                    patch({ negativeTemplate: event.target.value })
                  }
                  spellCheck={false}
                  className="min-h-16 font-mono text-[11px]"
                />
              </div>
              <p className="text-muted-foreground text-[10px]">
                {t("characters.templateHint")}
              </p>

              <div className="bg-muted/30 space-y-2 rounded-md p-2.5">
                <div className="space-y-0.5">
                  <span className="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">
                    {t("characters.previewPositive")}
                  </span>
                  {positivePreview ? (
                    <p className="font-mono text-[11px] leading-relaxed break-words">
                      {positivePreview}
                    </p>
                  ) : (
                    <p className="text-muted-foreground/60 text-[11px]">
                      {t("characters.previewEmpty")}
                    </p>
                  )}
                </div>
                {negativePreview ? (
                  <div className="space-y-0.5">
                    <span className="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">
                      {t("characters.previewNegative")}
                    </span>
                    <p className="font-mono text-[11px] leading-relaxed break-words">
                      {negativePreview}
                    </p>
                  </div>
                ) : null}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </ScrollArea>
    </div>
  );
}
