"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@nai-desktop-studio/ui/components/dialog";
import { ImageIcon } from "lucide-react";

import type { GeneratedImage } from "../types/image";
import { formatBatchTime, groupHistoryByBatch } from "../utils/history";
import { useI18n } from "@/i18n/provider";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  images: GeneratedImage[];
  resolveSrc: (image: GeneratedImage) => string;
  /** Opens a batch and replaces what the workspace shows. */
  onOpenBatch: (images: GeneratedImage[]) => void;
};

/**
 * List of saved images. The history strip at the bottom shows only the most
 * recent ones, so this is a separate entry point for reviewing past batches all
 * at once.
 */
export function LibraryDialog({
  open,
  onOpenChange,
  images,
  resolveSrc,
  onOpenBatch,
}: Props) {
  const { t, locale } = useI18n();
  const groups = groupHistoryByBatch(images);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-4xl">
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
          <div className="max-h-[65vh] space-y-5 overflow-y-auto pr-1">
            {groups.map((group) => (
              <section key={group.batchId} className="space-y-2">
                <div className="text-muted-foreground flex items-baseline gap-2 text-xs">
                  <span className="tabular-nums">
                    {formatBatchTime(group.createdAt, locale)}
                  </span>
                  <span className="tabular-nums">
                    {t("unit.images", { count: group.images.length })}
                  </span>
                </div>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(7rem,1fr))] gap-2">
                  {group.images.map((image) => (
                    <button
                      key={image.id}
                      type="button"
                      title={image.prompt || t("viewer.library.noPrompt")}
                      // title isn't reliable as the accessible name, so set it
                      // explicitly.
                      aria-label={`${t("viewer.library.openImage", {
                        time: formatBatchTime(image.createdAt, locale),
                      })}${image.prompt ? ` (${image.prompt})` : ""}`}
                      onClick={() => {
                        onOpenBatch(group.images);
                        onOpenChange(false);
                      }}
                      className="hover:ring-primary aspect-[3/4] overflow-hidden rounded-md border transition hover:ring-2"
                    >
                      <img
                        src={resolveSrc(image)}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className="size-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
