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
import { ImagePlus, Loader2, Search, Settings2, Trash2 } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { collectGroupNames } from "@/components/group-field";
import { readImageFile } from "@/features/generate/lib/image-file";
import { useT } from "@/i18n/provider";

import { useReferences } from "../hooks/queries";
import { referenceImageUrl } from "../lib/api";
import {
  createEmptyReference,
  searchableReferenceText,
  type ReferenceEntry,
  type ReferenceKind,
} from "../types/reference";
import {
  ReferenceEntryFields,
  ReferenceEntryStatus,
} from "./reference-entry-fields";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Only entries of this kind can be used in the current run. */
  kind: ReferenceKind;
  selectedIds: string[];
  onSelectedChange: (ids: string[]) => void;
  /** Opens the vibe store, so a missing image can be added and filed here. */
  onManage: () => void;
  /**
   * How many more images this run has room for. A request is capped whatever
   * the images came from, so what the panel already holds counts against this.
   */
  remaining: number;
};

/**
 * The saved reference images, and which of them this run uses.
 *
 * The badge on a tile is the point of the whole screen: an entry that has been
 * encoded costs nothing to use again, and one that has not will spend 2 Anlas
 * the first time it goes out. That is the difference between picking from here
 * and dropping the same file in every time.
 */
export function ReferencePickerDialog({
  open,
  onOpenChange,
  kind,
  selectedIds,
  onSelectedChange,
  onManage,
  remaining,
}: Props) {
  const t = useT();
  const { references, create, save, remove } = useReferences();
  const [query, setQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const ofKind = useMemo(
    () => references.filter((entry) => entry.kind === kind),
    [references, kind]
  );

  const shown = useMemo(() => {
    const text = query.trim().toLowerCase();
    if (!text) return ofKind;
    return ofKind.filter((entry) =>
      searchableReferenceText(entry).includes(text)
    );
  }, [ofKind, query]);

  const sections = useMemo(() => {
    const map = new Map<string, ReferenceEntry[]>();
    for (const entry of shown) {
      const key = entry.groupName ?? "";
      map.set(key, [...(map.get(key) ?? []), entry]);
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
  }, [shown, t]);

  const editing = references.find((entry) => entry.id === editingId) ?? null;
  const groupOptions = collectGroupNames(references);

  async function add(file: File) {
    const read = await readImageFile(file);
    if (!read.ok) {
      toast.error(
        read.reason === "not-image"
          ? t("reference.error.notImage")
          : t("reference.error.tooLarge")
      );
      return;
    }
    URL.revokeObjectURL(read.previewUrl);
    setBusy(true);
    try {
      const draft = createEmptyReference(
        kind,
        file.name.replace(/\.[^.]+$/, "") || t("referenceLibrary.newName")
      );
      // One request: the server writes the image and the settings together, so
      // a failure here leaves nothing half-made to clean up.
      const entry = await create.mutateAsync({
        metadata: {
          name: draft.name,
          groupName: draft.groupName,
          kind: draft.kind,
          strength: draft.strength,
          infoExtracted: draft.infoExtracted,
          referenceType: draft.referenceType,
          fidelity: draft.fidelity,
        },
        imageBase64: read.imageBase64,
        contentType: file.type || "image/png",
      });
      setEditingId(entry.id);
    } catch {
      toast.error(t("referenceLibrary.saveError"));
    } finally {
      setBusy(false);
    }
  }

  function toggle(id: string) {
    if (selectedIds.includes(id)) {
      onSelectedChange(selectedIds.filter((item) => item !== id));
      setEditingId(id);
      return;
    }
    // Deselecting is always allowed; only adding can run past the limit.
    if (remaining <= 0) {
      toast.error(t("referenceLibrary.atMax"));
      return;
    }
    onSelectedChange([...selectedIds, id]);
    setEditingId(id);
  }

  function patch(next: Partial<ReferenceEntry>) {
    if (!editing) return;
    save.mutate({
      ...editing,
      ...next,
      updatedAt: new Date().toISOString(),
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[85vh] flex-col gap-3 sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{t("referenceLibrary.title")}</DialogTitle>
          <DialogDescription>
            {t("referenceLibrary.description")}
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
              placeholder={t("referenceLibrary.search")}
              className="h-8 pl-7"
            />
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) void add(file);
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
          >
            {busy ? <Loader2 className="animate-spin" /> : <ImagePlus />}
            {t("referenceLibrary.add")}
          </Button>
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

        <div className="flex min-h-0 flex-1 gap-3">
          <div className="-mx-1 min-h-0 min-w-0 flex-1 overflow-y-auto px-1">
            {sections.length === 0 ? (
              <div className="text-muted-foreground flex h-full min-h-40 items-center justify-center rounded-md border border-dashed p-4 text-center text-xs leading-relaxed">
                {ofKind.length === 0
                  ? t("referenceLibrary.empty")
                  : t("referenceLibrary.noMatch")}
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
                      {section.items.map((entry) => {
                        const order = selectedIds.indexOf(entry.id);
                        const selected = order >= 0;
                        return (
                          <button
                            key={entry.id}
                            type="button"
                            onClick={() => toggle(entry.id)}
                            aria-pressed={selected}
                            className={cn(
                              "bg-card relative flex flex-col overflow-hidden rounded-lg border text-left transition-[border-color,box-shadow] duration-150 ease-out",
                              selected
                                ? "ring-primary ring-offset-popover ring-2 ring-offset-2"
                                : "hover:border-primary/40",
                              entry.id === editingId &&
                                !selected &&
                                "border-primary"
                            )}
                          >
                            <span className="bg-muted flex aspect-square w-full items-center justify-center overflow-hidden">
                              <img
                                src={referenceImageUrl(entry.id)}
                                alt=""
                                draggable={false}
                                loading="lazy"
                                decoding="async"
                                className="size-full object-cover select-none"
                              />
                            </span>
                            <span className="flex min-w-0 flex-col gap-0.5 px-2 py-1.5">
                              <span
                                className="truncate text-xs font-medium"
                                title={entry.name}
                              >
                                {entry.name}
                              </span>
                              {/* Encoded or not is the only thing here that
                                  costs money, so it gets the colour. */}
                              <ReferenceEntryStatus entry={entry} />
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

          <div className="w-72 shrink-0 space-y-3 overflow-y-auto border-l py-1 pr-1 pl-3">
            {editing ? (
              <>
                <ReferenceEntryFields
                  entry={editing}
                  groupOptions={groupOptions}
                  onPatch={patch}
                />

                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="w-full"
                  onClick={() => {
                    onSelectedChange(
                      selectedIds.filter((id) => id !== editing.id)
                    );
                    setEditingId(null);
                    remove.mutate(editing);
                  }}
                >
                  <Trash2 />
                  {t("action.delete")}
                </Button>
              </>
            ) : (
              <p className="text-muted-foreground rounded-md border border-dashed p-3 text-center text-[11px] leading-relaxed">
                {t("referenceLibrary.pickToEdit")}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between border-t pt-3">
          <span className="text-muted-foreground font-mono text-[11px] tabular-nums">
            {t("generate.picker.selectedCount", { count: selectedIds.length })}
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
