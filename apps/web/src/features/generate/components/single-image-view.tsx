"use client";

import { useEffect, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ClipboardCopy,
  Download,
  Hash,
  Loader2,
  Trash2,
} from "lucide-react";
import { Button } from "@nai-desktop-studio/ui/components/button";
import { cn } from "@nai-desktop-studio/ui/lib/utils";
import type {
  GeneratedImage,
  GenerationSlot,
} from "@/features/generate/types/image";
import { useT } from "@/i18n/provider";

type Props = {
  /**
   * Slots of the batch to display (in generation order). image=null means
   * queued/generating.
   */
  slots: GenerationSlot[];
  /** Converts a GeneratedImage to a display URL (path is server-relative). */
  resolveSrc: (image: GeneratedImage) => string;
  /** Small version, for the filmstrip along the bottom. */
  resolveThumb: (image: GeneratedImage) => string;
  onOpenLightbox: (id: string) => void;
  /** Bottom action bar. The caller owns the behavior. */
  onDownload: (image: GeneratedImage) => void;
  onCopyPrompt: (image: GeneratedImage) => void;
  onCopySeed: (image: GeneratedImage) => void;
  onDelete: (image: GeneratedImage) => void;
};

// Carousel slide width (%). The remaining (100-SLIDE_W)/2 on each side lets the
// previous/next slides peek in at the edges.
const SLIDE_W = 78;
// Swipe commit threshold (px). Below it, snap back to the original position.
const SWIPE_THRESHOLD = 60;

/**
 * NovelAI-style single-image view (carousel). Shows the current image large and
 * centered, with the previous/next images peeking in at the edges. It can be
 * switched with the left/right buttons, swipe (drag-follow + slide animation),
 * and the thumbnails at the bottom, and it moves to the latest automatically
 * when a new image finishes (the caller resets the selection by changing the key
 * on a batch switch).
 */
export function SingleImageView({
  slots,
  resolveSrc,
  resolveThumb,
  onOpenLightbox,
  onDownload,
  onCopyPrompt,
  onCopySeed,
  onDelete,
}: Props) {
  const t = useT();
  const images = slots
    .map((s) => s.image)
    .filter((x): x is GeneratedImage => x !== null);
  // null = follow the latest finished image. Moving manually pins it, and it
  // returns to the latest again on the next finish.
  const [manualIdx, setManualIdx] = useState<number | null>(null);
  const [dragPx, setDragPx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    setManualIdx(null);
  }, [images.length]);

  let latestIdx = 0;
  for (let i = slots.length - 1; i >= 0; i--) {
    if (slots[i]?.image) {
      latestIdx = i;
      break;
    }
  }
  const currentIdx = Math.min(
    manualIdx ?? latestIdx,
    Math.max(0, slots.length - 1)
  );
  const hasPrev = currentIdx > 0;
  const hasNext = currentIdx < slots.length - 1;
  const shown = slots[currentIdx]?.image ?? null;

  function goTo(idx: number) {
    setManualIdx(Math.max(0, Math.min(idx, slots.length - 1)));
  }

  function handleTouchStart(e: React.TouchEvent) {
    const touch = e.touches[0];
    if (!touch) return;
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    setDragging(true);
  }

  function handleTouchMove(e: React.TouchEvent) {
    const start = touchStartRef.current;
    const touch = e.touches[0];
    if (!start || !touch) return;
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    if (Math.abs(dx) < Math.abs(dy)) return;
    // Add resistance at the ends to signal "there's nothing more".
    const resisted = (dx > 0 && !hasPrev) || (dx < 0 && !hasNext) ? dx / 3 : dx;
    setDragPx(resisted);
  }

  // Decide from the touch start/end coordinates, not from state (dragPx). On a
  // fast flick, touchmove may not have been applied yet and dragPx is stale.
  function handleTouchEnd(e: React.TouchEvent) {
    const start = touchStartRef.current;
    touchStartRef.current = null;
    setDragging(false);
    setDragPx(0);
    const touch = e.changedTouches[0];
    if (!start || !touch) return;
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    if (Math.abs(dx) < SWIPE_THRESHOLD || Math.abs(dx) < Math.abs(dy)) return;
    if (dx < 0 && hasNext) goTo(currentIdx + 1);
    else if (dx > 0 && hasPrev) goTo(currentIdx - 1);
  }

  function handleTouchCancel() {
    touchStartRef.current = null;
    setDragging(false);
    setDragPx(0);
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div
        className="relative min-h-0 flex-1 touch-pan-y overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchCancel}
      >
        <div
          className={cn(
            "flex h-full",
            !dragging && "transition-transform duration-300 ease-out"
          )}
          style={{
            transform: `translateX(calc(${(100 - SLIDE_W) / 2 - currentIdx * SLIDE_W}% + ${dragPx}px))`,
          }}
        >
          {slots.map((slot, i) => {
            const image = slot.image;
            // Fix the height with h-full/w-full (with max-h-full the child img's
            // max-h-full has no effect and tall images get cut off top and
            // bottom). Centering the previous/next slides would keep a tall
            // image from reaching the edge band, so the "peek" wouldn't show —
            // align the previous slide right and the next slide left.
            const align =
              i === currentIdx
                ? "justify-center"
                : i < currentIdx
                  ? "justify-end"
                  : "justify-start";

            return (
              <div
                key={slot.key}
                className="flex h-full shrink-0 items-center px-2 py-4"
                style={{ width: `${SLIDE_W}%` }}
              >
                {image ? (
                  <button
                    type="button"
                    onClick={() =>
                      i === currentIdx ? onOpenLightbox(image.id) : goTo(i)
                    }
                    title={
                      i === currentIdx
                        ? t("viewer.single.clickToEnlarge")
                        : t("viewer.single.showThisImage")
                    }
                    aria-label={
                      i === currentIdx
                        ? t("viewer.single.clickToEnlarge")
                        : t("viewer.single.showThisImage")
                    }
                    className={cn(
                      "flex h-full w-full items-center transition-opacity duration-300 focus-visible:outline-none",
                      align,
                      i !== currentIdx && "opacity-40 hover:opacity-70"
                    )}
                  >
                    <img
                      src={resolveSrc(image)}
                      alt=""
                      draggable={false}
                      className="max-h-full max-w-full rounded-lg border object-contain select-none"
                    />
                  </button>
                ) : (
                  // Give the generating placeholder the same alignment as the
                  // image.
                  <div
                    className={cn(
                      "relative flex h-full w-full items-center",
                      align
                    )}
                  >
                    {/* An empty svg with a viewBox is a replaced element, so
                        max-h/max-w clamp it while keeping its ratio — it lands
                        on exactly the box the finished image will take. (A div
                        with aspect-ratio only clamps on one axis: right for one
                        orientation, wrong for the other.)

                        The live preview rides on it as a background rather than
                        as its own img, because NovelAI's intermediate frames are
                        a fraction of the final size and an img would draw at
                        that size. This way the skeleton, the preview and the
                        finished image share one footprint and nothing moves or
                        resizes on the way through. */}
                    <svg
                      viewBox={`0 0 ${slot.aspect} 1`}
                      aria-hidden
                      className={cn(
                        "max-h-full max-w-full rounded-lg border bg-cover",
                        slot.previewDataUrl
                          ? "opacity-80"
                          : "border-primary/35 bg-muted/30 border-dashed"
                      )}
                      style={
                        slot.previewDataUrl
                          ? {
                              backgroundImage: `url("${slot.previewDataUrl}")`,
                            }
                          : undefined
                      }
                    />
                    {!slot.previewDataUrl && (
                      <Loader2
                        className="text-primary absolute inset-0 m-auto size-8 animate-spin"
                        aria-hidden
                      />
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {hasPrev && (
          <button
            type="button"
            onClick={() => goTo(currentIdx - 1)}
            title={t("viewer.nav.prev")}
            className="bg-background/80 text-foreground hover:bg-background absolute top-1/2 left-3 z-10 flex size-10 -translate-y-1/2 items-center justify-center rounded-full border backdrop-blur transition-colors"
          >
            <ChevronLeft className="size-5" aria-hidden />
            <span className="sr-only">{t("viewer.nav.prev")}</span>
          </button>
        )}
        {hasNext && (
          <button
            type="button"
            onClick={() => goTo(currentIdx + 1)}
            title={t("viewer.nav.next")}
            className="bg-background/80 text-foreground hover:bg-background absolute top-1/2 right-3 z-10 flex size-10 -translate-y-1/2 items-center justify-center rounded-full border backdrop-blur transition-colors"
          >
            <ChevronRight className="size-5" aria-hidden />
            <span className="sr-only">{t("viewer.nav.next")}</span>
          </button>
        )}

        {shown && (
          <div className="bg-background/80 absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-0.5 rounded-full border p-1 backdrop-blur">
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              className="rounded-full"
              title={t("viewer.action.download")}
              onClick={() => onDownload(shown)}
            >
              <Download aria-hidden />
              <span className="sr-only">{t("viewer.action.download")}</span>
            </Button>
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              className="rounded-full"
              title={t("viewer.action.copyPrompt")}
              onClick={() => onCopyPrompt(shown)}
            >
              <ClipboardCopy aria-hidden />
              <span className="sr-only">{t("viewer.action.copyPrompt")}</span>
            </Button>
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              className="rounded-full"
              title={t("viewer.action.copySeed")}
              onClick={() => onCopySeed(shown)}
            >
              <Hash aria-hidden />
              <span className="sr-only">{t("viewer.action.copySeed")}</span>
            </Button>
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              className="text-destructive rounded-full"
              title={t("action.delete")}
              onClick={() => onDelete(shown)}
            >
              <Trash2 aria-hidden />
              <span className="sr-only">{t("action.delete")}</span>
            </Button>
          </div>
        )}
      </div>

      {slots.length > 1 && (
        <div className="shrink-0 overflow-x-auto border-t px-4 py-2">
          <div className="flex items-center gap-1.5">
            {slots.map((slot, i) => {
              const image = slot.image;
              return image ? (
                <button
                  key={slot.key}
                  type="button"
                  onClick={() => goTo(i)}
                  title={t("viewer.single.showThisImage")}
                  aria-label={t("viewer.single.showThisImage")}
                  className={cn(
                    "aspect-[3/4] h-16 shrink-0 overflow-hidden rounded border transition",
                    i === currentIdx
                      ? "ring-primary ring-2"
                      : "opacity-70 hover:opacity-100"
                  )}
                >
                  <img
                    src={resolveThumb(image)}
                    loading="lazy"
                    decoding="async"
                    alt=""
                    className="size-full object-cover"
                  />
                </button>
              ) : (
                <div
                  key={slot.key}
                  className={cn(
                    "border-primary/35 flex aspect-[3/4] h-16 shrink-0 items-center justify-center overflow-hidden rounded border border-dashed",
                    i === currentIdx && "ring-primary/50 ring-2"
                  )}
                >
                  {slot.previewDataUrl ? (
                    <img
                      src={slot.previewDataUrl}
                      alt=""
                      className="size-full object-cover opacity-80"
                    />
                  ) : (
                    <Loader2
                      className="text-primary size-4 animate-spin"
                      aria-hidden
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
