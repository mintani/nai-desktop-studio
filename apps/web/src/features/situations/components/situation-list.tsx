"use client";

import { Button } from "@nai-desktop-studio/ui/components/button";
import { Input } from "@nai-desktop-studio/ui/components/input";
import { ScrollArea } from "@nai-desktop-studio/ui/components/scroll-area";
import { cn } from "@nai-desktop-studio/ui/lib/utils";
import { Plus } from "lucide-react";
import { useMemo, useState } from "react";

import { useT } from "@/i18n/provider";

import {
  searchableSituationText,
  stripManagedSituationTokens,
  type Situation,
} from "../lib/template";

type Props = {
  situations: Situation[];
  selectedId: string | null;
  creating: boolean;
  onSelect: (id: string) => void;
  onCreate: () => void;
};

/** Groups by name, keeping the ungrouped bucket last. */
function groupSituations(items: Situation[], ungroupedLabel: string) {
  const groups = new Map<string, Situation[]>();
  for (const item of items) {
    const key = item.groupName ?? "";
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  return Array.from(groups.entries())
    .sort(([a], [b]) => {
      if (!a) return 1;
      if (!b) return -1;
      return a.localeCompare(b);
    })
    .map(([groupName, groupItems]) => ({
      key: groupName || "__ungrouped__",
      label: groupName || ungroupedLabel,
      items: groupItems,
    }));
}

export function SituationList({
  situations,
  selectedId,
  creating,
  onSelect,
  onCreate,
}: Props) {
  const t = useT();
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return situations;
    return situations.filter((item) =>
      searchableSituationText(item).includes(query)
    );
  }, [situations, search]);

  const groups = useMemo(
    () => groupSituations(filtered, t("group.none")),
    [filtered, t]
  );

  return (
    <div className="flex h-full min-h-0 flex-col gap-2 p-3">
      <Input
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder={t("situations.search.placeholder")}
        autoComplete="off"
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full"
        disabled={creating}
        onClick={onCreate}
      >
        <Plus aria-hidden />
        {t("situations.new")}
      </Button>

      <ScrollArea className="min-h-0 flex-1">
        {situations.length === 0 ? (
          <div className="px-2 py-8 text-center">
            <p className="text-sm font-medium">{t("situations.empty.title")}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {t("situations.empty.body")}
            </p>
          </div>
        ) : (
          <div className="space-y-3 pr-2">
            {groups.map((group) => (
              <section key={group.key} className="space-y-1">
                {/* Uppercasing only bites on the English label, so a Japanese
                    group name and "UNGROUPED" would sit in the same list wearing
                    different clothes. */}
                <div className="flex items-center gap-1.5 px-1">
                  <h3 className="text-[11px] font-medium text-muted-foreground">
                    {group.label}
                  </h3>
                  <span className="font-mono text-[10px] tabular-nums text-muted-foreground/70">
                    {group.items.length}
                  </span>
                </div>
                {group.items.map((item) => {
                  // Without the append-only slot, or an untouched situation
                  // would preview as "{additional}" and look like it had text.
                  const preview = stripManagedSituationTokens(
                    item.basePrompt,
                    "basePrompt"
                  ).trim();
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onSelect(item.id)}
                      className={cn(
                        "w-full rounded-sm border border-transparent px-2 py-1.5 text-left",
                        selectedId === item.id
                          ? "border-border bg-muted"
                          : "hover:bg-muted/50"
                      )}
                    >
                      <p className="truncate text-xs font-medium">
                        {item.name}
                      </p>
                      <p className="truncate font-mono text-[10px] text-muted-foreground">
                        {preview || t("situations.noPrompt")}
                      </p>
                    </button>
                  );
                })}
              </section>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
