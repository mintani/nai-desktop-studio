"use client";

import { Button } from "@nai-desktop-studio/ui/components/button";
import { Checkbox } from "@nai-desktop-studio/ui/components/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@nai-desktop-studio/ui/components/dialog";
import { Input } from "@nai-desktop-studio/ui/components/input";
import { cn } from "@nai-desktop-studio/ui/lib/utils";
import { ChevronDown, Search, Settings2 } from "lucide-react";
import { useMemo, useState } from "react";

import {
  searchableSituationText,
  stripManagedSituationTokens,
  type Situation,
} from "@/features/situations/lib/template";
import { useT } from "@/i18n/provider";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  situations: Situation[];
  selectedIds: string[];
  onSelectedChange: (ids: string[]) => void;
  /** Opens the situation manager, so a missing scene can be written here. */
  onManage: () => void;
};

/**
 * Picks the scenes for the next run.
 *
 * Several situations at once, because that is what makes a batch a batch: the
 * same cast run through a list of scenes. Groups lead, since a group is usually
 * the unit someone thinks in ("the school set"), and the individual scenes are
 * behind a chevron for when the group is not quite what they wanted.
 */
export function SituationPickerDialog({
  open,
  onOpenChange,
  situations,
  selectedIds,
  onSelectedChange,
  onManage,
}: Props) {
  const t = useT();
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(
    () => new Set()
  );

  const sections = useMemo(() => {
    const text = query.trim().toLowerCase();
    const groupLabel = t("group.none");
    const map = new Map<string, Situation[]>();

    for (const situation of situations) {
      if (text) {
        const group = (situation.groupName ?? groupLabel).toLowerCase();
        if (
          !group.includes(text) &&
          !searchableSituationText(situation).includes(text)
        ) {
          continue;
        }
      }
      const key = situation.groupName ?? "";
      map.set(key, [...(map.get(key) ?? []), situation]);
    }

    return [...map.entries()]
      .sort(([a], [b]) => {
        if (!a) return 1;
        if (!b) return -1;
        return a.localeCompare(b, "ja");
      })
      .map(([key, items]) => ({
        key: key || "__ungrouped__",
        name: key || groupLabel,
        items,
      }));
  }, [situations, query, t]);

  // While searching every match is open: the point of typing is to see the
  // scenes that matched, not the groups they happen to live in.
  const searching = query.trim().length > 0;

  function toggleOne(id: string) {
    onSelectedChange(
      selectedIds.includes(id)
        ? selectedIds.filter((item) => item !== id)
        : [...selectedIds, id]
    );
  }

  function toggleGroup(ids: string[], select: boolean) {
    const rest = selectedIds.filter((id) => !ids.includes(id));
    onSelectedChange(select ? [...rest, ...ids] : rest);
  }

  function toggleExpanded(key: string) {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[80vh] flex-col gap-3 sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{t("generate.situationPicker.title")}</DialogTitle>
          <DialogDescription>
            {t("generate.situationPicker.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <Search
              className="text-muted-foreground pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2"
              aria-hidden
            />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("generate.situationPicker.search")}
              className="h-8 pl-7"
            />
          </div>
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
              {situations.length === 0
                ? t("situations.empty.title")
                : t("generate.situationPicker.empty")}
            </div>
          ) : (
            <div className="space-y-1.5 pb-1">
              {sections.map((section) => {
                const ids = section.items.map((item) => item.id);
                const chosen = ids.filter((id) => selectedIds.includes(id));
                const all = chosen.length === ids.length;
                const some = chosen.length > 0 && !all;
                const isOpen = searching || expanded.has(section.key);

                return (
                  <div
                    key={section.key}
                    className={cn(
                      "overflow-hidden rounded-md border transition-[border-color] duration-150 ease-out",
                      all || some ? "border-primary" : "border-border"
                    )}
                  >
                    <div className="flex items-center">
                      <button
                        type="button"
                        onClick={() => toggleGroup(ids, !all)}
                        aria-pressed={all}
                        className={cn(
                          "focus-visible:ring-ring/50 flex min-w-0 flex-1 items-center gap-2 px-2.5 py-2 text-left outline-none focus-visible:ring-1",
                          all && "bg-secondary"
                        )}
                      >
                        <Checkbox
                          checked={all}
                          indeterminate={some}
                          tabIndex={-1}
                          aria-hidden
                        />
                        <span className="min-w-0 flex-1 truncate text-xs font-medium">
                          {section.name}
                        </span>
                        <span className="text-muted-foreground shrink-0 font-mono text-[10px] tabular-nums">
                          {chosen.length > 0 ? `${chosen.length}/` : ""}
                          {ids.length}
                        </span>
                      </button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="mr-1 shrink-0"
                        onClick={() => toggleExpanded(section.key)}
                        aria-expanded={isOpen}
                        title={t("generate.situationPicker.expand")}
                      >
                        <ChevronDown
                          className={cn(
                            "transition-transform duration-150 ease-out",
                            isOpen && "rotate-180"
                          )}
                          aria-hidden
                        />
                        <span className="sr-only">
                          {t("generate.situationPicker.expand")}
                        </span>
                      </Button>
                    </div>

                    {isOpen && (
                      <div className="border-t">
                        {section.items.map((situation) => {
                          const selected = selectedIds.includes(situation.id);
                          const preview = stripManagedSituationTokens(
                            situation.basePrompt,
                            "basePrompt"
                          ).trim();
                          return (
                            <button
                              key={situation.id}
                              type="button"
                              onClick={() => toggleOne(situation.id)}
                              aria-pressed={selected}
                              className={cn(
                                "focus-visible:ring-ring/50 flex w-full items-center gap-2 px-2.5 py-1.5 text-left outline-none focus-visible:ring-1",
                                selected ? "bg-secondary" : "hover:bg-muted/50"
                              )}
                            >
                              <Checkbox
                                checked={selected}
                                tabIndex={-1}
                                aria-hidden
                              />
                              <span className="flex min-w-0 flex-1 flex-col">
                                <span className="truncate text-xs">
                                  {situation.name}
                                </span>
                                <span className="text-muted-foreground truncate font-mono text-[10px]">
                                  {preview || t("situations.noPrompt")}
                                </span>
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t pt-3">
          <span className="text-muted-foreground font-mono text-[11px] tabular-nums">
            {t("generate.situationPicker.selectedCount", {
              count: selectedIds.length,
            })}
          </span>
          <div className="flex gap-2">
            {selectedIds.length > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onSelectedChange([])}
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
