"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@nai-desktop-studio/ui/components/alert-dialog";
import { Button } from "@nai-desktop-studio/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@nai-desktop-studio/ui/components/dialog";
import { Input } from "@nai-desktop-studio/ui/components/input";
import { Palette, Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { useT } from "@/i18n/provider";

import { duplicateStyle, useStyles } from "../hooks/queries";
import type { Style } from "../types/style";
import { StyleCard } from "./style-card";
import { StyleEditor } from "./style-editor";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type EditTarget = { style: Style | null };

type Section = { key: string; name: string | null; items: Style[] };

/** Named groups first (alphabetical), ungrouped last. */
function groupStyles(styles: Style[], query: string): Section[] {
  const q = query.trim().toLowerCase();
  const filtered = q
    ? styles.filter(
        (style) =>
          style.name.toLowerCase().includes(q) ||
          style.styleTag.toLowerCase().includes(q)
      )
    : styles;

  const named = new Map<string, Style[]>();
  const ungrouped: Style[] = [];
  for (const style of filtered) {
    if (style.groupName) {
      const list = named.get(style.groupName) ?? [];
      list.push(style);
      named.set(style.groupName, list);
    } else {
      ungrouped.push(style);
    }
  }

  const sections: Section[] = [...named.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([name, items]) => ({ key: name, name, items }));
  if (ungrouped.length > 0) {
    sections.push({ key: "__ungrouped__", name: null, items: ungrouped });
  }
  return sections;
}

export function StyleManagerDialog({ open, onOpenChange }: Props) {
  const t = useT();
  const { styles, isPending, save, remove } = useStyles();

  const [editing, setEditing] = useState<EditTarget | null>(null);
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Style | null>(null);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);

  const sections = useMemo(() => groupStyles(styles, search), [styles, search]);

  function handleOpenChange(next: boolean) {
    if (!next) {
      setEditing(null);
      setDeleteTarget(null);
    }
    onOpenChange(next);
  }

  async function handleDuplicate(style: Style) {
    setDuplicatingId(style.id);
    try {
      const clone = await duplicateStyle(style, t("styles.copySuffix"));
      await save.mutateAsync(clone);
    } catch {
      toast.error(t("styles.toast.duplicateFailed"));
    } finally {
      setDuplicatingId(null);
    }
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    try {
      await remove.mutateAsync(deleteTarget);
      setDeleteTarget(null);
    } catch {
      toast.error(t("styles.toast.deleteFailed"));
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-lg">
          {editing ? (
            <StyleEditor
              style={editing.style}
              onClose={() => setEditing(null)}
            />
          ) : (
            <div className="flex max-h-[80vh] flex-col gap-3">
              <div className="flex items-center justify-between gap-2 pr-8">
                <div className="space-y-0.5">
                  <DialogTitle>{t("styles.title")}</DialogTitle>
                  <p className="text-muted-foreground text-xs tabular-nums">
                    {t("styles.subtitle", { count: styles.length })}
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setEditing({ style: null })}
                >
                  <Plus />
                  {t("styles.new")}
                </Button>
              </div>

              <div className="relative">
                <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={t("styles.search")}
                  className="pl-8"
                />
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-1">
                {isPending && styles.length === 0 ? null : styles.length ===
                  0 ? (
                  <div className="rounded-md border border-dashed p-8 text-center">
                    <Palette className="text-muted-foreground/50 mx-auto size-9" />
                    <h3 className="mt-3 text-sm font-medium">
                      {t("styles.empty.title")}
                    </h3>
                    <p className="text-muted-foreground mt-1 text-xs">
                      {t("styles.empty.hint")}
                    </p>
                  </div>
                ) : sections.length === 0 ? (
                  <div className="rounded-md border border-dashed p-8 text-center">
                    <Search className="text-muted-foreground/50 mx-auto size-8" />
                    <p className="text-muted-foreground mt-3 text-xs">
                      {t("styles.noResults", { query: search.trim() })}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {sections.map((section) => (
                      <section key={section.key} className="space-y-2">
                        <h4 className="text-muted-foreground text-[11px] font-medium">
                          {section.name ?? t("group.none")}
                        </h4>
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                          {section.items.map((style) => (
                            <StyleCard
                              key={style.id}
                              style={style}
                              busy={duplicatingId === style.id}
                              onEdit={(target) => setEditing({ style: target })}
                              onDuplicate={handleDuplicate}
                              onDelete={setDeleteTarget}
                            />
                          ))}
                        </div>
                      </section>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(next) => {
          if (!next && !remove.isPending) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("styles.delete.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("styles.delete.body", {
                name: deleteTarget?.name ?? "",
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={remove.isPending}>
              {t("action.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={remove.isPending}
              onClick={(event) => {
                event.preventDefault();
                void handleConfirmDelete();
              }}
            >
              {t("styles.delete.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
