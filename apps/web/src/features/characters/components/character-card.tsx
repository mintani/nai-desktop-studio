"use client";

import { Button } from "@nai-desktop-studio/ui/components/button";
import { cn } from "@nai-desktop-studio/ui/lib/utils";
import { Copy, Trash2 } from "lucide-react";

import { useT } from "@/i18n/provider";

import { buildCharacterPositivePrompt, type Character } from "../lib/template";
import { CharacterThumbnail } from "./character-thumbnail";

type Props = {
  character: Character;
  selected: boolean;
  onSelect: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
};

/**
 * One row in the character list: name and a one-line preview of the built
 * positive prompt. Duplicate and delete sit in-flow on the right so they never
 * overlap the name; they stay reserved but hidden until hover or keyboard focus.
 */
export function CharacterCard({
  character,
  selected,
  onSelect,
  onDuplicate,
  onDelete,
}: Props) {
  const t = useT();
  const preview = buildCharacterPositivePrompt(character);

  return (
    <div
      className={cn(
        "group flex items-stretch rounded-sm border transition-colors",
        selected
          ? "border-primary bg-muted/50"
          : "border-border hover:bg-muted/30"
      )}
    >
      <button
        type="button"
        onClick={onSelect}
        className="flex min-w-0 flex-1 items-center gap-2 px-2.5 py-2 text-left outline-none"
      >
        <CharacterThumbnail
          character={character}
          className="size-8 rounded-sm border"
        />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate text-xs font-medium" title={character.name}>
            {character.name}
          </span>
          {preview ? (
            <span
              className="text-muted-foreground truncate font-mono text-[10px]"
              title={preview}
            >
              {preview}
            </span>
          ) : null}
        </span>
      </button>
      <div className="flex shrink-0 items-center gap-0.5 pr-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          title={t("characters.duplicate")}
          onClick={onDuplicate}
        >
          <Copy />
          <span className="sr-only">{t("characters.duplicate")}</span>
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          title={t("action.delete")}
          onClick={onDelete}
        >
          <Trash2 />
          <span className="sr-only">{t("action.delete")}</span>
        </Button>
      </div>
    </div>
  );
}
