"use client";

import { Button } from "@nai-desktop-studio/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@nai-desktop-studio/ui/components/dialog";
import { cn } from "@nai-desktop-studio/ui/lib/utils";
import { ChevronRight, ImageDown, Sparkles, Type, Wand } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { useT } from "@/i18n/provider";

import type { PngMetadata } from "../lib/png-metadata";

/** What a dropped image can become. */
export type DroppedImage = {
  previewUrl: string;
  imageBase64: string;
  fileName: string;
  metadata: PngMetadata;
  metadataCount: number;
};

export type DropAction = "i2i" | "prompt" | "vibe" | "reference";

type Props = {
  image: DroppedImage | null;
  /** Precise reference is V4.5-only, so the choice is not always offered. */
  referenceAvailable: boolean;
  onChoose: (action: DropAction) => void;
  onCancel: () => void;
};

function Choice({
  icon: Icon,
  title,
  detail,
  disabled,
  onClick,
}: {
  icon: LucideIcon;
  title: string;
  detail: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "group flex w-full items-center gap-3 rounded-sm border px-3 py-2.5 text-left transition-colors duration-150 ease-out",
        disabled
          ? "cursor-not-allowed opacity-45"
          : "hover:border-primary hover:bg-secondary"
      )}
    >
      <Icon className="text-muted-foreground size-4 shrink-0" aria-hidden />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium">{title}</span>
        <span className="text-muted-foreground block text-xs">{detail}</span>
      </span>
      {!disabled && (
        <ChevronRight
          className="text-muted-foreground size-4 shrink-0"
          aria-hidden
        />
      )}
    </button>
  );
}

/**
 * What to do with an image that was dropped on the window.
 *
 * A dropped file is ambiguous on purpose — the same picture is a starting
 * point, a set of settings to copy, or something to transfer a look from — so
 * it asks rather than picking one. The image is shown at size next to the
 * choices, because the answer usually depends on which image it is.
 */
export function ImageDropDialog({
  image,
  referenceAvailable,
  onChoose,
  onCancel,
}: Props) {
  const t = useT();
  const hasMetadata = (image?.metadataCount ?? 0) > 0;

  return (
    <Dialog
      open={image !== null}
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
    >
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{t("drop.title")}</DialogTitle>
          <DialogDescription className="truncate">
            {image?.fileName}
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-4">
          <span className="bg-muted h-40 w-32 shrink-0 overflow-hidden rounded-md border">
            {image && (
              <img
                src={image.previewUrl}
                alt=""
                className="size-full object-cover"
              />
            )}
          </span>

          <div className="min-w-0 flex-1 space-y-1.5">
            <Choice
              icon={ImageDown}
              title={t("drop.i2i.title")}
              detail={t("drop.i2i.detail")}
              onClick={() => onChoose("i2i")}
            />
            <Choice
              icon={Type}
              title={t("drop.prompt.title")}
              detail={
                hasMetadata
                  ? t("drop.prompt.found", { count: image?.metadataCount ?? 0 })
                  : t("drop.prompt.none")
              }
              disabled={!hasMetadata}
              onClick={() => onChoose("prompt")}
            />
            <Choice
              icon={Sparkles}
              title={t("drop.vibe.title")}
              detail={t("drop.vibe.detail")}
              onClick={() => onChoose("vibe")}
            />
            <Choice
              icon={Wand}
              title={t("drop.reference.title")}
              detail={
                referenceAvailable
                  ? t("drop.reference.detail")
                  : t("reference.onlyV45")
              }
              disabled={!referenceAvailable}
              onClick={() => onChoose("reference")}
            />
          </div>
        </div>

        <div className="flex justify-end">
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
            {t("action.cancel")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
