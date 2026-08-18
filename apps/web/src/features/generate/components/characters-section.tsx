"use client";

import { Button } from "@nai-desktop-studio/ui/components/button";
import { Label } from "@nai-desktop-studio/ui/components/label";
import { cn } from "@nai-desktop-studio/ui/lib/utils";
import { Eye, EyeOff, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import { GenderSelect } from "@/components/gender-select";
import { TagAutocompleteTextarea } from "@/components/tag-autocomplete/tag-autocomplete-textarea";
import { useT } from "@/i18n/provider";

import { DEFAULT_CHARACTER } from "../constants";
import type { CharacterData, FormState } from "../types/generate";
import { CharacterPlacementGrid } from "./character-placement-grid";

type Props = {
  characters: CharacterData[];
  update: (patch: Partial<FormState>) => void;
  /** width / height of the image being made, so the frame matches it. */
  aspect: number;
};

/** The first tag of a character's prompt, which is usually enough to tell it apart. */
function firstTag(prompt: string) {
  return prompt.split(",")[0]?.trim() ?? "";
}

export function CharactersSection({ characters, update, aspect }: Props) {
  const t = useT();
  // Which character the grid places. Kept as an index because a form character
  // has no id — it is only its slot in the list.
  const [activeIndex, setActiveIndex] = useState(0);

  const active = Math.min(activeIndex, Math.max(0, characters.length - 1));

  function patchCharacter(index: number, patch: Partial<CharacterData>) {
    update({
      characters: characters.map((character, i) =>
        i === index ? { ...character, ...patch } : character
      ),
    });
  }

  return (
    <div className="space-y-2">
      {characters.length > 0 && (
        <div className="space-y-1.5 pb-1">
          <Label>{t("generate.placement.label")}</Label>
          <CharacterPlacementGrid
            entries={characters.map((character, index) => ({
              id: String(index),
              label:
                firstTag(character.prompt) ||
                t("generate.character.n", { index: index + 1 }),
              position: character.position,
            }))}
            aspect={aspect}
            activeId={String(active)}
            onActiveChange={(id) => setActiveIndex(Number(id))}
            onPositionChange={(id, position) =>
              patchCharacter(Number(id), { position })
            }
          />
        </div>
      )}

      {characters.map((character, index) => (
        <div
          key={index}
          // Touching a character's fields makes it the one the grid places, so
          // there is nothing extra to click before setting where it stands.
          onFocusCapture={() => setActiveIndex(index)}
          className={cn(
            "space-y-2 rounded-md border p-2 transition-shadow duration-150 ease-out",
            index === active && characters.length > 1 && "ring-primary ring-2"
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground font-display flex items-center gap-1.5 text-[11px] font-medium">
              {t("generate.character.n", { index: index + 1 })}
              {character.position && (
                <span className="font-mono tabular-nums">
                  {character.position}
                </span>
              )}
            </span>
            <div className="flex items-center gap-0.5">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-6"
                title={
                  character.enabled
                    ? t("generate.character.disable")
                    : t("generate.character.enable")
                }
                onClick={() =>
                  patchCharacter(index, { enabled: !character.enabled })
                }
              >
                {character.enabled ? (
                  <Eye className="size-3.5" />
                ) : (
                  <EyeOff className="size-3.5" />
                )}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-6"
                title={t("action.delete")}
                onClick={() =>
                  update({
                    characters: characters.filter((_, i) => i !== index),
                  })
                }
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          </div>

          <div className={cn("space-y-2", !character.enabled && "opacity-50")}>
            {/* Ahead of the prompt because it lands ahead of it: the subject
                is the first tag of the caption that gets sent. */}
            <GenderSelect
              id={`character-gender-${index}`}
              value={character.gender}
              onChange={(gender) => patchCharacter(index, { gender })}
            />
            <TagAutocompleteTextarea
              id={`character-prompt-${index}`}
              rows={2}
              value={character.prompt}
              onChange={(prompt) => patchCharacter(index, { prompt })}
              placeholder={t("generate.character.promptPlaceholder")}
            />
            <TagAutocompleteTextarea
              id={`character-negative-${index}`}
              rows={1}
              value={character.negativePrompt}
              onChange={(negativePrompt) =>
                patchCharacter(index, { negativePrompt })
              }
              placeholder={t("generate.character.negativePlaceholder")}
            />
          </div>
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full"
        onClick={() => {
          setActiveIndex(characters.length);
          update({ characters: [...characters, { ...DEFAULT_CHARACTER }] });
        }}
      >
        <Plus className="mr-1 size-4" />
        {t("generate.character.add")}
      </Button>
    </div>
  );
}
