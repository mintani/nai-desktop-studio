"use client";

import { Button } from "@nai-desktop-studio/ui/components/button";
import { Input } from "@nai-desktop-studio/ui/components/input";
import { ScrollArea } from "@nai-desktop-studio/ui/components/scroll-area";
import { cn } from "@nai-desktop-studio/ui/lib/utils";
import { Copy, ImagePlus, Loader2, Search, Trash2 } from "lucide-react";
import { useMemo, useRef } from "react";

import { useT } from "@/i18n/provider";

import { referenceImageUrl } from "../lib/api";
import {
  searchableReferenceText,
  type ReferenceEntry,
} from "../types/reference";
import { ReferenceEntryStatus } from "./reference-entry-fields";

type Props = {
  entries: ReferenceEntry[];
  selectedId: string | null;
  search: string;
  onSearchChange: (value: string) => void;
  onSelect: (id: string) => void;
  /** Creating needs an image, so "new" is a file pick rather than a button. */
  onAdd: (file: File) => void;
  adding: boolean;
  onDuplicate: (entry: ReferenceEntry) => void;
  onDelete: (entry: ReferenceEntry) => void;
};

type Group = { key: string; label: string; items: ReferenceEntry[] };

/** Group by `groupName`, keeping the ungrouped bucket last. */
function groupEntries(list: ReferenceEntry[], ungroupedLabel: string): Group[] {
  const groups = new Map<string, ReferenceEntry[]>();
  for (const entry of list) {
    const key = entry.groupName ?? "";
    groups.set(key, [...(groups.get(key) ?? []), entry]);
  }

  return Array.from(groups.entries())
    .sort(([a], [b]) => {
      if (!a) return 1;
      if (!b) return -1;
      return a.localeCompare(b, "ja");
    })
    .map(([key, items]) => ({
      key: key || "ungrouped",
      label: key || ungroupedLabel,
      items,
    }));
}

/** One row: picture, name and what using the entry costs. */
function EntryRow({
  entry,
  selected,
  onSelect,
  onDuplicate,
  onDelete,
}: {
  entry: ReferenceEntry;
  selected: boolean;
  onSelect: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const t = useT();

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
        <img
          src={referenceImageUrl(entry.id)}
          alt=""
          loading="lazy"
          decoding="async"
          className="size-8 shrink-0 rounded-sm border object-cover"
        />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate text-xs font-medium" title={entry.name}>
            {entry.name}
          </span>
          <ReferenceEntryStatus entry={entry} />
        </span>
      </button>
      <div className="flex shrink-0 items-center gap-0.5 pr-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          title={t("referenceStore.duplicate")}
          onClick={onDuplicate}
        >
          <Copy />
          <span className="sr-only">{t("referenceStore.duplicate")}</span>
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

export function ReferenceEntryList({
  entries,
  selectedId,
  search,
  onSearchChange,
  onSelect,
  onAdd,
  adding,
  onDuplicate,
  onDelete,
}: Props) {
  const t = useT();
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return entries;
    return entries.filter((entry) =>
      searchableReferenceText(entry).includes(query)
    );
  }, [entries, search]);

  const groups = useMemo(
    () => groupEntries(filtered, t("group.none")),
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
            placeholder={t("referenceLibrary.search")}
            className="h-7 pl-7"
          />
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            // Reset every time so the same file can be picked again.
            event.target.value = "";
            if (file) onAdd(file);
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          title={t("referenceLibrary.add")}
          disabled={adding}
          onClick={() => inputRef.current?.click()}
        >
          {adding ? <Loader2 className="animate-spin" /> : <ImagePlus />}
          <span className="sr-only">{t("referenceLibrary.add")}</span>
        </Button>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-3 p-2">
          {entries.length === 0 ? (
            <p className="text-muted-foreground rounded-sm border border-dashed p-4 text-center text-xs">
              {t("referenceLibrary.empty")}
            </p>
          ) : filtered.length === 0 ? (
            <p className="text-muted-foreground rounded-sm border border-dashed p-4 text-center text-xs">
              {t("referenceLibrary.noMatch")}
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
                  {group.items.map((entry) => (
                    <EntryRow
                      key={entry.id}
                      entry={entry}
                      selected={entry.id === selectedId}
                      onSelect={() => onSelect(entry.id)}
                      onDuplicate={() => onDuplicate(entry)}
                      onDelete={() => onDelete(entry)}
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
