"use client";

import { Button } from "@nai-desktop-studio/ui/components/button";
import { cn } from "@nai-desktop-studio/ui/lib/utils";
import { ChevronDown, ChevronUp, X } from "lucide-react";

import { GenderSelect } from "@/components/gender-select";
import { CharacterThumbnail } from "@/features/characters/components/character-thumbnail";
import type { Character } from "@/features/characters/lib/template";
import { useT } from "@/i18n/provider";

import { describePosition } from "../lib/placement";
import type { TemplateCharacterPick } from "../types/template";

type Props = {
  picked: TemplateCharacterPick[];
  characters: Character[];
  /**
   * The one the placement grid is placing. Picking a row changes it. Left out
   * where there is no grid to place into — then the name is not a control,
   * because pressing it would change nothing anyone can see.
   */
  activeId?: string | null;
  onActiveChange?: (id: string) => void;
  onPickedChange: (next: TemplateCharacterPick[]) => void;
  /**
   * Saves a change back to the character. Given only where the subject can be
   * set — it belongs to the character, not to this run, so it is written
   * through rather than kept as a per-run override that a reload would lose.
   */
  onCharacterChange?: (character: Character) => void;
  /** V5 places anywhere on the frame; older models use the 5x5 grid. */
  freeform: boolean;
};

/**
 * The cast in order. The order is not cosmetic — the scene's `{token}`s are
 * filled from the first character — so it is set here with the arrows rather
 * than left to the order things happened to be clicked in.
 *
 * The row is a plain container and only the name is a button. Making the whole
 * row clickable would have meant a div pretending to be a button while holding
 * three real ones, which loses the focus ring and the keyboard behaviour that
 * come for free from the real thing.
 */
export function SelectedCharacterList({
  picked,
  characters,
  activeId,
  onActiveChange,
  onPickedChange,
  onCharacterChange,
  freeform,
}: Props) {
  const t = useT();
  const selectable = onActiveChange !== undefined;

  function move(index: number, delta: -1 | 1) {
    const next = [...picked];
    const target = next[index];
    const swap = next[index + delta];
    if (!target || !swap) return;
    next[index] = swap;
    next[index + delta] = target;
    onPickedChange(next);
  }

  return (
    <div className="space-y-1">
      {picked.map((entry, index) => {
        const character = characters.find((item) => item.id === entry.id);
        const active = selectable && entry.id === activeId;
        const name = (
          <>
            {character && (
              <CharacterThumbnail
                character={character}
                className="size-7 rounded-sm border"
              />
            )}
            <span className="min-w-0 flex-1 truncate text-[11px] font-medium">
              {character?.name ?? t("generate.picker.missing")}
            </span>
          </>
        );

        return (
          <div
            key={entry.id}
            className={cn(
              // The active row wears the same clothes as a chosen resolution
              // button: secondary fill, primary edge. No third vocabulary.
              "space-y-1 rounded-md border p-1 transition-[border-color,background-color] duration-150 ease-out",
              active ? "border-primary bg-secondary" : "border-border"
            )}
          >
            <div className="flex items-center gap-1">
              <span className="bg-primary text-primary-foreground flex size-4 shrink-0 items-center justify-center rounded-full font-mono text-[9px] font-semibold tabular-nums">
                {index + 1}
              </span>
              {onActiveChange ? (
                <button
                  type="button"
                  onClick={() => onActiveChange(entry.id)}
                  title={t("generate.character.select")}
                  className="focus-visible:ring-ring/50 flex min-w-0 flex-1 items-center gap-1.5 rounded-sm text-left outline-none focus-visible:ring-1"
                >
                  {name}
                </button>
              ) : (
                <span className="flex min-w-0 flex-1 items-center gap-1.5">
                  {name}
                </span>
              )}
              {/* Only when placed. "Anywhere" on every row would be noise, and the
                grid already shows who is on it. */}
              {entry.position && (
                <span className="text-muted-foreground shrink-0 font-mono text-[10px] tabular-nums">
                  {describePosition(entry.position, freeform)}
                </span>
              )}
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                disabled={index === 0}
                onClick={() => move(index, -1)}
                title={t("generate.character.moveUp")}
              >
                <ChevronUp aria-hidden />
                <span className="sr-only">
                  {t("generate.character.moveUp")}
                </span>
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                disabled={index === picked.length - 1}
                onClick={() => move(index, 1)}
                title={t("generate.character.moveDown")}
              >
                <ChevronDown aria-hidden />
                <span className="sr-only">
                  {t("generate.character.moveDown")}
                </span>
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                className="text-muted-foreground hover:text-destructive"
                onClick={() =>
                  onPickedChange(picked.filter((item) => item.id !== entry.id))
                }
                title={t("generate.character.remove")}
              >
                <X aria-hidden />
                <span className="sr-only">
                  {t("generate.character.remove")}
                </span>
              </Button>
            </div>
            {onCharacterChange && character && (
              <GenderSelect
                value={character.gender}
                onChange={(gender) =>
                  onCharacterChange({ ...character, gender })
                }
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
