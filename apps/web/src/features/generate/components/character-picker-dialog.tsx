"use client";

import { Button } from "@nai-desktop-studio/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@nai-desktop-studio/ui/components/dialog";
import { Input } from "@nai-desktop-studio/ui/components/input";
import { Label } from "@nai-desktop-studio/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@nai-desktop-studio/ui/components/select";
import { cn } from "@nai-desktop-studio/ui/lib/utils";
import { Search, Settings2 } from "lucide-react";
import { useMemo, useState } from "react";

import { CharacterThumbnail } from "@/features/characters/components/character-thumbnail";
import {
  buildCharacterPositivePrompt,
  searchableCharacterText,
  type Character,
} from "@/features/characters/lib/template";
import { useT } from "@/i18n/provider";

import type { TemplateCharacterPick } from "../types/template";
import { CharacterPlacementGrid } from "./character-placement-grid";
import { SelectedCharacterList } from "./selected-character-list";

const ALL_GROUPS = "__all__";
const NO_GROUP = "__none__";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  characters: Character[];
  picked: TemplateCharacterPick[];
  onPickedChange: (next: TemplateCharacterPick[]) => void;
  /** The character the placement grid is placing. Shared with the panel. */
  activeId: string | null;
  onActiveChange: (id: string) => void;
  /** width / height of the image being made, so the frame matches it. */
  aspect: number;
  /** V5 places anywhere on the frame; older models use the 5x5 grid. */
  freeform: boolean;
  /** Saves a subject change back to the character record. */
  onCharacterChange: (character: Character) => void;
  /** Opens the character manager, so a missing character can be added here. */
  onManage: () => void;
};

/**
 * Picks the cast for the next generation.
 *
 * A name is a poor way to tell characters apart, so the list is a grid of
 * pictures and the choice is made by looking rather than by reading. Clicking
 * adds or removes without closing the dialog — picking a cast is several
 * decisions, not one — and the right-hand side holds the order and the placement
 * so the whole arrangement is settled in one place.
 */
export function CharacterPickerDialog({
  open,
  onOpenChange,
  characters,
  picked,
  onPickedChange,
  activeId,
  onActiveChange,
  aspect,
  freeform,
  onCharacterChange,
  onManage,
}: Props) {
  const t = useT();
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState(ALL_GROUPS);

  const pickedIds = picked.map((entry) => entry.id);

  const groupNames = useMemo(() => {
    const names = new Set<string>();
    for (const character of characters) {
      if (character.groupName) names.add(character.groupName);
    }
    return [...names].sort((a, b) => a.localeCompare(b, "ja"));
  }, [characters]);

  const filtered = useMemo(() => {
    const text = query.trim().toLowerCase();
    return characters.filter((character) => {
      const inGroup =
        group === ALL_GROUPS
          ? true
          : group === NO_GROUP
            ? character.groupName === null
            : character.groupName === group;
      if (!inGroup) return false;
      return !text || searchableCharacterText(character).includes(text);
    });
  }, [characters, query, group]);

  // Keep the group headings after filtering, with the ungrouped bucket last.
  const sections = useMemo(() => {
    const map = new Map<string, Character[]>();
    for (const character of filtered) {
      const key = character.groupName ?? "";
      map.set(key, [...(map.get(key) ?? []), character]);
    }
    return [...map.entries()]
      .sort(([a], [b]) => {
        if (!a) return 1;
        if (!b) return -1;
        return a.localeCompare(b, "ja");
      })
      .map(([key, items]) => ({
        key: key || "__ungrouped__",
        name: key || t("group.none"),
        items,
      }));
  }, [filtered, t]);

  const groupItems = [
    { value: ALL_GROUPS, label: t("generate.picker.groupAll") },
    { value: NO_GROUP, label: t("group.none") },
    ...groupNames.map((name) => ({ value: name, label: name })),
  ];

  function toggle(id: string) {
    onPickedChange(
      pickedIds.includes(id)
        ? picked.filter((entry) => entry.id !== id)
        : [...picked, { id, position: null }]
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[85vh] max-w-4xl flex-col gap-3 sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{t("generate.picker.title")}</DialogTitle>
          <DialogDescription>
            {t("generate.picker.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 gap-3">
          <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2">
            <div className="flex items-center gap-2">
              <div className="relative min-w-0 flex-1">
                <Search
                  className="text-muted-foreground pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2"
                  aria-hidden
                />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={t("generate.picker.search")}
                  className="h-8 pl-7"
                />
              </div>
              <Label htmlFor="picker-group" className="sr-only">
                {t("generate.picker.group")}
              </Label>
              <Select
                value={group}
                items={groupItems}
                onValueChange={(value) => {
                  if (typeof value === "string") setGroup(value);
                }}
              >
                <SelectTrigger id="picker-group" className="w-36 shrink-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {groupItems.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0"
                onClick={onManage}
              >
                <Settings2 />
                {t("generate.picker.manage")}
              </Button>
            </div>

            <div className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1">
              {sections.length === 0 ? (
                <div className="text-muted-foreground flex h-full min-h-40 items-center justify-center rounded-md border border-dashed text-xs">
                  {characters.length === 0
                    ? t("characters.empty")
                    : t("generate.picker.empty")}
                </div>
              ) : (
                <div className="space-y-4 pb-1">
                  {sections.map((section) => (
                    <section key={section.key} className="space-y-2">
                      <div className="flex items-center gap-1.5 border-b pb-1">
                        <h3 className="text-xs font-medium">{section.name}</h3>
                        <span className="text-muted-foreground/70 font-mono text-[10px] tabular-nums">
                          {section.items.length}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                        {section.items.map((character) => {
                          const order = pickedIds.indexOf(character.id);
                          const selected = order >= 0;
                          const preview =
                            buildCharacterPositivePrompt(character);

                          return (
                            // Same clothes as a selected tile in the image
                            // grid: primary ring, offset, badge top-right.
                            // Picking a picture out of a grid is the same act
                            // in both places.
                            <button
                              key={character.id}
                              type="button"
                              onClick={() => toggle(character.id)}
                              aria-pressed={selected}
                              className={cn(
                                "bg-card relative flex flex-col overflow-hidden rounded-lg border text-left transition-[border-color,box-shadow] duration-150 ease-out",
                                selected
                                  ? "ring-primary ring-offset-popover ring-2 ring-offset-2"
                                  : "hover:border-primary/40"
                              )}
                            >
                              <CharacterThumbnail
                                character={character}
                                className="aspect-[3/4] w-full"
                              />
                              <span className="flex min-w-0 flex-col gap-0.5 px-2 py-1.5">
                                <span
                                  className="truncate text-xs font-medium"
                                  title={character.name}
                                >
                                  {character.name}
                                </span>
                                <span className="text-muted-foreground truncate font-mono text-[10px]">
                                  {preview || t("generate.picker.noPrompt")}
                                </span>
                              </span>
                              {selected && (
                                <span className="bg-primary text-primary-foreground ring-background absolute top-1.5 right-1.5 flex size-5 items-center justify-center rounded-full font-mono text-[10px] font-semibold tabular-nums ring-2">
                                  {order + 1}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </section>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* The ring on the active card sits outside its border, so the
              scroll container keeps a little padding for it. */}
          <div className="w-80 shrink-0 space-y-3 overflow-y-auto border-l py-1 pr-1 pl-3">
            {picked.length === 0 ? (
              <p className="text-muted-foreground rounded-md border border-dashed p-3 text-center text-[11px] leading-relaxed">
                {t("generate.picker.emptySelection")}
              </p>
            ) : (
              <>
                <div className="space-y-1.5">
                  <Label>{t("generate.placement.label")}</Label>
                  <CharacterPlacementGrid
                    entries={picked.map((entry) => {
                      const character = characters.find(
                        (item) => item.id === entry.id
                      );
                      return {
                        id: entry.id,
                        label: character?.name ?? t("generate.picker.missing"),
                        position: entry.position,
                        imagePath: character?.imagePath ?? null,
                      };
                    })}
                    aspect={aspect}
                    freeform={freeform}
                    activeId={activeId}
                    onActiveChange={onActiveChange}
                    onPositionChange={(id, position) =>
                      onPickedChange(
                        picked.map((entry) =>
                          entry.id === id ? { ...entry, position } : entry
                        )
                      )
                    }
                  />
                </div>
                <SelectedCharacterList
                  picked={picked}
                  characters={characters}
                  activeId={activeId}
                  onActiveChange={onActiveChange}
                  onPickedChange={onPickedChange}
                  onCharacterChange={onCharacterChange}
                  freeform={freeform}
                />
              </>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between border-t pt-3">
          <span className="text-muted-foreground font-mono text-[11px] tabular-nums">
            {t("generate.picker.selectedCount", { count: picked.length })}
          </span>
          <div className="flex gap-2">
            {picked.length > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onPickedChange([])}
              >
                {t("generate.picker.clear")}
              </Button>
            )}
            <Button type="button" size="sm" onClick={() => onOpenChange(false)}>
              {t("generate.picker.done")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
