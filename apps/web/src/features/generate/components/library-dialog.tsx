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
  DialogHeader,
  DialogTitle,
} from "@nai-desktop-studio/ui/components/dialog";
import { cn } from "@nai-desktop-studio/ui/lib/utils";
import {
  Check,
  Copy,
  Download,
  ImageIcon,
  Loader2,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";

import { useI18n } from "@/i18n/provider";

import type { GeneratedImage } from "../types/image";
import { formatBatchTime, groupHistoryByBatch } from "../utils/history";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  images: GeneratedImage[];
  resolveSrc: (image: GeneratedImage) => string;
  /** Opens a batch and replaces what the workspace shows. */
  onOpenBatch: (images: GeneratedImage[]) => void;
  onDownload: (image: GeneratedImage) => void;
  onCopyPrompt: (image: GeneratedImage) => void;
  onDeleteImages: (ids: string[]) => Promise<unknown>;
  isDeleting: boolean;
};

/**
 * Every saved image, and what can be done with them.
 *
 * The history strip only shows the most recent run, so this is where a past
 * batch is found again — and where a run that did not work out is thrown away.
 * Tiles select the way they do in the grid (ring plus a badge), because a
 * second language for "this one is picked" would be one to learn for nothing.
 */
export function LibraryDialog({
  open,
  onOpenChange,
  images,
  resolveSrc,
  onOpenBatch,
  onDownload,
  onCopyPrompt,
  onDeleteImages,
  isDeleting,
}: Props) {
  const { t, locale } = useI18n();
  const groups = groupHistoryByBatch(images);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [confirming, setConfirming] = useState(false);

  // A selection is about what is on screen now. Reopening the dialog should
  // not resume one made before, and an image deleted elsewhere must not stay
  // selected and get counted in the next action.
  useEffect(() => {
    if (!open) setSelectedIds([]);
  }, [open]);
  useEffect(() => {
    const alive = new Set(images.map((image) => image.id));
    setSelectedIds((current) => current.filter((id) => alive.has(id)));
  }, [images]);

  const selected = images.filter((image) => selectedIds.includes(image.id));
  const onlySelected = selected.length === 1 ? selected[0] : null;

  function toggle(id: string) {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id]
    );
  }

  function toggleBatch(batch: GeneratedImage[]) {
    const ids = batch.map((image) => image.id);
    const allPicked = ids.every((id) => selectedIds.includes(id));
    setSelectedIds((current) =>
      allPicked
        ? current.filter((id) => !ids.includes(id))
        : [...current.filter((id) => !ids.includes(id)), ...ids]
    );
  }

  async function deleteSelected() {
    setConfirming(false);
    await onDeleteImages(selectedIds);
    setSelectedIds([]);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>
            {t("viewer.library.title")} (
            {t("unit.images", { count: images.length })})
          </DialogTitle>
        </DialogHeader>

        {groups.length === 0 ? (
          <div className="text-muted-foreground flex flex-col items-center gap-2 py-12 text-sm">
            <ImageIcon className="size-8 opacity-40" aria-hidden />
            {t("viewer.library.empty")}
          </div>
        ) : (
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto pr-1">
            {groups.map((group) => {
              const ids = group.images.map((image) => image.id);
              const picked = ids.filter((id) =>
                selectedIds.includes(id)
              ).length;

              return (
                <section key={group.batchId} className="space-y-2">
                  <div className="flex items-baseline justify-between gap-2">
                    <div className="text-muted-foreground flex items-baseline gap-2 font-mono text-xs tabular-nums">
                      <span>{formatBatchTime(group.createdAt, locale)}</span>
                      <span>
                        {t("unit.images", { count: group.images.length })}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      {picked > 0 && (
                        <span className="text-primary font-mono text-[11px] tabular-nums">
                          {t("viewer.library.pickedInBatch", { count: picked })}
                        </span>
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => toggleBatch(group.images)}
                      >
                        {picked === ids.length
                          ? t("viewer.library.deselectBatch")
                          : t("viewer.library.selectBatch")}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => {
                          onOpenBatch(group.images);
                          onOpenChange(false);
                        }}
                      >
                        {t("viewer.library.openBatch")}
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-[repeat(auto-fill,minmax(7rem,1fr))] gap-2">
                    {group.images.map((image) => {
                      const isSelected = selectedIds.includes(image.id);

                      return (
                        <button
                          key={image.id}
                          type="button"
                          aria-pressed={isSelected}
                          title={image.prompt || t("viewer.library.noPrompt")}
                          aria-label={`${t("viewer.library.openImage", {
                            time: formatBatchTime(image.createdAt, locale),
                          })}${image.prompt ? ` (${image.prompt})` : ""}`}
                          onClick={() => toggle(image.id)}
                          onDoubleClick={() => {
                            onOpenBatch(group.images);
                            onOpenChange(false);
                          }}
                          className={cn(
                            "bg-card relative overflow-hidden rounded-md border transition-[box-shadow] duration-150 ease-out",
                            isSelected
                              ? "ring-primary ring-offset-card ring-2 ring-offset-2"
                              : "hover:ring-primary/40 hover:ring-2"
                          )}
                        >
                          <span className="relative block aspect-[3/4] w-full">
                            <img
                              src={resolveSrc(image)}
                              alt=""
                              loading="lazy"
                              decoding="async"
                              className="pointer-events-none size-full object-cover"
                            />
                            {isSelected && (
                              <>
                                <span
                                  className="bg-primary/10 pointer-events-none absolute inset-0"
                                  aria-hidden
                                />
                                <span className="bg-primary text-primary-foreground ring-background absolute top-1.5 right-1.5 flex size-5 items-center justify-center rounded-full ring-2">
                                  <Check
                                    className="size-3"
                                    strokeWidth={3}
                                    aria-hidden
                                  />
                                </span>
                              </>
                            )}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        )}

        {/* Only present while something is picked. A bar of disabled buttons
            waiting for a selection is furniture. */}
        {selected.length > 0 && (
          <div className="flex shrink-0 items-center justify-between gap-2 border-t pt-3">
            <span className="font-mono text-xs tabular-nums">
              {t("viewer.library.selectedCount", { count: selected.length })}
            </span>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setSelectedIds([])}
              >
                {t("viewer.library.clearSelection")}
              </Button>
              {onlySelected && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onCopyPrompt(onlySelected)}
                >
                  <Copy className="mr-1 size-3.5" aria-hidden />
                  {t("viewer.action.copyPrompt")}
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => selected.forEach(onDownload)}
              >
                <Download className="mr-1 size-3.5" aria-hidden />
                {t("viewer.action.download")}
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={isDeleting}
                onClick={() => setConfirming(true)}
              >
                {isDeleting ? (
                  <Loader2 className="mr-1 size-3.5 animate-spin" aria-hidden />
                ) : (
                  <Trash2 className="mr-1 size-3.5" aria-hidden />
                )}
                {t("action.delete")}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>

      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("viewer.library.deleteTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("viewer.library.deleteDescription", {
                count: selected.length,
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("action.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => void deleteSelected()}
            >
              {t("action.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
