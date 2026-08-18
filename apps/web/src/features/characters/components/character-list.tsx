"use client";

import { Button } from "@nai-desktop-studio/ui/components/button";
import { Input } from "@nai-desktop-studio/ui/components/input";
import { ScrollArea } from "@nai-desktop-studio/ui/components/scroll-area";
import { Plus, Search } from "lucide-react";
import { useMemo } from "react";

import { useT } from "@/i18n/provider";

import { searchableCharacterText, type Character } from "../lib/template";
import { CharacterCard } from "./character-card";

type Props = {
  characters: Character[];
  selectedId: string | null;
  search: string;
  onSearchChange: (value: string) => void;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onDuplicate: (character: Character) => void;
  onDelete: (character: Character) => void;
};

type Group = { key: string; label: string; items: Character[] };

/** Group by `groupName`, keeping the ungrouped bucket last. */
function groupCharacters(list: Character[], ungroupedLabel: string): Group[] {
  const groups = new Map<string, Character[]>();
  for (const character of list) {
    const key = character.groupName ?? "";
    groups.set(key, [...(groups.get(key) ?? []), character]);
  }

  return Array.from(groups.entries())
    .sort(([a], [b]) => {
      if (!a) return 1;
      if (!b) return -1;
      return a.localeCompare(b);
    })
    .map(([key, items]) => ({
      key: key || "ungrouped",
      label: key || ungroupedLabel,
      items,
    }));
}

export function CharacterList({
  characters,
  selectedId,
  search,
  onSearchChange,
  onSelect,
  onCreate,
  onDuplicate,
  onDelete,
}: Props) {
  const t = useT();

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return characters;
    return characters.filter((character) =>
      searchableCharacterText(character).includes(query)
    );
  }, [characters, search]);

  const groups = useMemo(
    () => groupCharacters(filtered, t("group.none")),
    [filtered, t]
  );

  return (
    <div className="flex min-h-0 w-60 shrink-0 flex-col border-r">
      <div className="flex shrink-0 items-center gap-2 border-b p-2">
        <div className="relative flex-1">
          <Search
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2"
            aria-hidden
          />
          <Input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={t("characters.searchPlaceholder")}
            className="h-7 pl-7"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          title={t("characters.create")}
          onClick={onCreate}
        >
          <Plus />
          <span className="sr-only">{t("characters.create")}</span>
        </Button>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-3 p-2">
          {characters.length === 0 ? (
            <p className="text-muted-foreground rounded-sm border border-dashed p-4 text-center text-xs">
              {t("characters.empty")}
            </p>
          ) : filtered.length === 0 ? (
            <p className="text-muted-foreground rounded-sm border border-dashed p-4 text-center text-xs">
              {t("characters.searchEmpty", { query: search.trim() })}
            </p>
          ) : (
            groups.map((group) => (
              <section key={group.key} className="space-y-1.5">
                <div className="flex items-center gap-1.5 px-0.5">
                  <h3 className="text-muted-foreground text-[11px] font-medium">
                    {group.label}
                  </h3>
                  <span className="text-muted-foreground/70 font-mono text-[10px] tabular-nums">
                    {group.items.length}
                  </span>
                </div>
                <div className="space-y-1">
                  {group.items.map((character) => (
                    <CharacterCard
                      key={character.id}
                      character={character}
                      selected={character.id === selectedId}
                      onSelect={() => onSelect(character.id)}
                      onDuplicate={() => onDuplicate(character)}
                      onDelete={() => onDelete(character)}
                    />
                  ))}
                </div>
              </section>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
