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
import { cn } from "@nai-desktop-studio/ui/lib/utils";
import { Check, ImageIcon, Search, Settings2 } from "lucide-react";
import { useMemo, useState } from "react";

import { assetUrl } from "@/features/library/collections";
import type { Style } from "@/features/styles/types/style";
import { useT } from "@/i18n/provider";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  styles: Style[];
  selectedId: string | null;
  onSelectedChange: (id: string | null) => void;
  /** Opens the style manager, so a missing style can be added here. */
  onManage: () => void;
};

/**
 * Picks the look for the next run.
 *
 * A style is a sample image before it is a name, so this is a grid of pictures
 * like the character picker — the same act deserves the same shape. One at a
 * time: a style sets the model and the parameters, and two of them would be
 * two different runs.
 */
export function StylePickerDialog({
  open,
  onOpenChange,
  styles,
  selectedId,
  onSelectedChange,
  onManage,
}: Props) {
  const t = useT();
  const [query, setQuery] = useState("");

  const sections = useMemo(() => {
    const text = query.trim().toLowerCase();
    const groupLabel = t("group.none");
    const map = new Map<string, Style[]>();

    for (const style of styles) {
      if (
        text &&
        !`${style.name} ${style.groupName ?? ""} ${style.styleTag}`
          .toLowerCase()
          .includes(text)
      ) {
        continue;
      }
      const key = style.groupName ?? "";
      map.set(key, [...(map.get(key) ?? []), style]);
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
  }, [styles, query, t]);

  function choose(id: string) {
    // Picking the chosen one again clears it: a run without a style is a
    // reachable state, and this is the only place to get back to it.
    onSelectedChange(selectedId === id ? null : id);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[80vh] flex-col gap-3 sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{t("generate.stylePicker.title")}</DialogTitle>
          <DialogDescription>
            {t("generate.stylePicker.description")}
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
              placeholder={t("generate.stylePicker.search")}
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
              {styles.length === 0
                ? t("styles.empty.title")
                : t("generate.stylePicker.empty")}
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
                    {section.items.map((style) => {
                      const selected = style.id === selectedId;
                      return (
                        // Same clothes as a selected tile in the character
                        // picker and the image grid.
                        <button
                          key={style.id}
                          type="button"
                          onClick={() => choose(style.id)}
                          aria-pressed={selected}
                          className={cn(
                            "bg-card relative flex flex-col overflow-hidden rounded-lg border text-left transition-[border-color,box-shadow] duration-150 ease-out",
                            selected
                              ? "ring-primary ring-offset-popover ring-2 ring-offset-2"
                              : "hover:border-primary/40"
                          )}
                        >
                          <span className="bg-muted text-muted-foreground/60 flex aspect-[3/4] w-full items-center justify-center overflow-hidden">
                            {style.samplePath ? (
                              <img
                                src={assetUrl(style.samplePath)}
                                alt=""
                                draggable={false}
                                loading="lazy"
                                decoding="async"
                                className="size-full object-cover select-none"
                              />
                            ) : (
                              <ImageIcon className="size-6" aria-hidden />
                            )}
                          </span>
                          <span className="flex min-w-0 flex-col gap-0.5 px-2 py-1.5">
                            <span
                              className="truncate text-xs font-medium"
                              title={style.name}
                            >
                              {style.name}
                            </span>
                            <span className="text-muted-foreground truncate font-mono text-[10px]">
                              {style.styleTag || t("generate.picker.noPrompt")}
                            </span>
                          </span>
                          {selected && (
                            <span className="bg-primary text-primary-foreground ring-background absolute top-1.5 right-1.5 flex size-5 items-center justify-center rounded-full ring-2">
                              <Check className="size-3" strokeWidth={3} />
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

        <div className="flex items-center justify-between border-t pt-3">
          <span className="text-muted-foreground text-[11px]">
            {selectedId
              ? (styles.find((item) => item.id === selectedId)?.name ?? "")
              : t("generate.stylePicker.none")}
          </span>
          <div className="flex gap-2">
            {selectedId && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onSelectedChange(null)}
              >
                {t("generate.stylePicker.clear")}
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
