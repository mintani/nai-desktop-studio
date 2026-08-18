"use client";

import { Button } from "@nai-desktop-studio/ui/components/button";
import { Copy, Palette, Trash2 } from "lucide-react";

import { assetUrl } from "@/features/library/collections";
import { useT } from "@/i18n/provider";

import type { Style } from "../types/style";

type Props = {
  style: Style;
  busy: boolean;
  onEdit: (style: Style) => void;
  onDuplicate: (style: Style) => void;
  onDelete: (style: Style) => void;
};

/** One style in the gallery: sample, name, style tag, and row actions. */
export function StyleCard({
  style,
  busy,
  onEdit,
  onDuplicate,
  onDelete,
}: Props) {
  const t = useT();

  return (
    <div className="group overflow-hidden rounded-md border">
      <button
        type="button"
        onClick={() => onEdit(style)}
        title={t("styles.action.edit")}
        className="bg-muted/30 relative flex aspect-[3/4] w-full items-center justify-center overflow-hidden focus-visible:outline-none"
      >
        {style.samplePath ? (
          <img
            src={assetUrl(style.samplePath)}
            alt=""
            className="size-full object-cover"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <Palette className="text-muted-foreground/40 size-8" aria-hidden />
        )}
        {style.groupName && (
          <span className="bg-background/85 text-muted-foreground absolute top-1 left-1 max-w-[calc(100%-0.5rem)] truncate rounded-sm px-1 py-0.5 text-[10px]">
            {style.groupName}
          </span>
        )}
      </button>

      <div className="space-y-0.5 px-2 py-1.5">
        <div
          className="truncate text-xs font-medium"
          title={style.name || t("styles.untitled")}
        >
          {style.name || t("styles.untitled")}
        </div>
        {style.styleTag && (
          <div
            className="text-muted-foreground truncate font-mono text-[10px]"
            title={style.styleTag}
          >
            {style.styleTag}
          </div>
        )}
      </div>

      <div className="bg-muted/30 flex items-center justify-between gap-1 border-t px-1.5 py-1">
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          title={t("styles.action.duplicate")}
          disabled={busy}
          onClick={() => onDuplicate(style)}
        >
          <Copy />
          <span className="sr-only">{t("styles.action.duplicate")}</span>
        </Button>
        <Button
          type="button"
          variant="destructive"
          size="icon-xs"
          title={t("styles.action.delete")}
          onClick={() => onDelete(style)}
        >
          <Trash2 />
          <span className="sr-only">{t("styles.action.delete")}</span>
        </Button>
      </div>
    </div>
  );
}
