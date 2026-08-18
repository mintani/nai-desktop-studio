"use client";

import type {
  GeneratedImage,
  GenerationSlot,
} from "@/features/generate/types/image";
import { useT } from "@/i18n/provider";
import { cn } from "@nai-desktop-studio/ui/lib/utils";
import { Check, Loader2 } from "lucide-react";

/** Tile minimum-width step (chosen from the toolbar). */
export type GenerateTileSize = "s" | "m" | "l";

const GRID_COLS: Record<GenerateTileSize, string> = {
  s: "grid-cols-[repeat(auto-fill,minmax(7rem,1fr))]",
  m: "grid-cols-[repeat(auto-fill,minmax(10rem,1fr))]",
  l: "grid-cols-[repeat(auto-fill,minmax(14rem,1fr))]",
};

type Props = {
  /** Slots to display. image=null means queued/generating. */
  slots: GenerationSlot[];
  /** Converts a GeneratedImage to a display URL (path is server-relative). */
  resolveSrc: (image: GeneratedImage) => string;
  /** Tile size. Defaults to medium. */
  tileSize?: GenerateTileSize;
  /**
   * IDs of currently multi-selected images. Shows a selection ring + check
   * badge.
   */
  selectedIds: string[];
  /**
   * Single click. The caller decides how selection toggles (event is passed).
   */
  onSelect: (imageId: string, e: React.MouseEvent) => void;
  /** Double click to open the enlarged view. */
  onOpen: (imageId: string) => void;
};

export function ImageGrid({
  slots,
  resolveSrc,
  tileSize = "m",
  selectedIds,
  onSelect,
  onOpen,
}: Props) {
  const t = useT();
  if (slots.length === 0) return null;

  return (
    // Don't center; pack fixed-width tiles from the top-left (start at top-left
    // even with only a few images).
    <div className={cn("grid content-start gap-3", GRID_COLS[tileSize])}>
      {slots.map((slot) => {
        const image = slot.image;

        if (!image) {
          return (
            <div
              key={slot.key}
              className="bg-card border-primary/35 ring-primary/15 cursor-wait overflow-hidden rounded-lg border border-dashed ring-2"
            >
              <div className="bg-muted/70 relative aspect-[3/4] w-full overflow-hidden">
                {/* Live preview while generating. Just the spinner if there
                isn't one yet. */}
                {slot.previewDataUrl && (
                  <img
                    src={slot.previewDataUrl}
                    alt=""
                    className="size-full object-cover opacity-80"
                  />
                )}
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2
                    className="text-primary size-10 animate-spin"
                    aria-hidden
                  />
                </div>
              </div>
            </div>
          );
        }

        const isSelected = selectedIds.includes(image.id);

        return (
          <button
            key={image.id}
            type="button"
            aria-pressed={isSelected}
            onClick={(e) => {
              e.stopPropagation();
              onSelect(image.id, e);
            }}
            onDoubleClick={(e) => {
              e.stopPropagation();
              onOpen(image.id);
            }}
            className={cn(
              "bg-card relative cursor-pointer overflow-hidden rounded-lg border transition-[border-color,box-shadow] duration-150 ease-out",
              isSelected && "ring-primary ring-2 ring-offset-2"
            )}
            title={t("viewer.grid.tileHint")}
          >
            {/* Use a span so the button's content is phrasing content. */}
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
                    <Check className="size-3" strokeWidth={3} aria-hidden />
                  </span>
                </>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
