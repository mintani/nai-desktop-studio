"use client";

/* eslint-disable jsx-a11y/no-noninteractive-element-interactions --
 * The image itself has click (stops propagation to the background) and double
 * click (toggles 1x <-> 2x zoom), so it can't be treated as a non-interactive
 * element. Keyboard input — Escape / arrows / i — is handled via keydown on
 * window, so the interactions aren't mouse-only. */

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { GeneratedImage } from "@/features/generate/types/image";
import { useI18n } from "@/i18n/provider";
import { cn } from "@nai-desktop-studio/ui/lib/utils";
import {
  ChevronLeft,
  ChevronRight,
  ClipboardCopy,
  Download,
  Hash,
  Info,
  Trash2,
  X,
} from "lucide-react";

type Props = {
  /** Set to page through. currentId must be contained in this array. */
  images: GeneratedImage[];
  currentId: string;
  /** Converts a GeneratedImage to a display URL (path is server-relative). */
  resolveSrc: (image: GeneratedImage) => string;
  onClose: () => void;
  onNavigate: (id: string) => void;
  /** Bottom action bar. The caller owns the behavior. */
  onDownload: (image: GeneratedImage) => void;
  onCopyPrompt: (image: GeneratedImage) => void;
  onCopySeed: (image: GeneratedImage) => void;
  onDelete: (image: GeneratedImage) => void;
};

// Controls over the overlay are unified as semi-transparent white buttons (a
// custom style matched to the dark background).
const CTRL =
  "flex size-9 items-center justify-center rounded-full text-white/90 transition-colors hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:outline-none";

export function ImageLightbox({
  images,
  currentId,
  resolveSrc,
  onClose,
  onNavigate,
  onDownload,
  onCopyPrompt,
  onCopySeed,
  onDelete,
}: Props) {
  const { t, locale } = useI18n();
  const index = images.findIndex((img) => img.id === currentId);
  const current = index >= 0 ? images[index] : undefined;
  const hasPrev = index > 0;
  const hasNext = index >= 0 && index < images.length - 1;

  const [showInfo, setShowInfo] = useState(false);

  // Zoom with the mouse wheel around the cursor position; while zoomed, drag to
  // pan.
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [panning, setPanning] = useState(false);
  const panDragRef = useRef<{
    x: number;
    y: number;
    panX: number;
    panY: number;
  } | null>(null);
  // Right after a drag while zoomed, suppress the resulting click (from mouseup)
  // once so it doesn't close.
  const suppressClickRef = useRef(false);

  const MIN_ZOOM = 1;
  const MAX_ZOOM = 6;

  function applyZoom(nextZoomRaw: number, originX: number, originY: number) {
    const rect = imgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const nextZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, nextZoomRaw));
    if (nextZoom === zoom) return;
    if (nextZoom === MIN_ZOOM) {
      setZoom(MIN_ZOOM);
      setPan({ x: 0, y: 0 });
      return;
    }
    // Adjust pan so the point under the cursor stays put (transform is a
    // center-based scale then translate).
    const centerX = rect.left + rect.width / 2 - pan.x;
    const centerY = rect.top + rect.height / 2 - pan.y;
    const contentX = (originX - centerX - pan.x) / zoom;
    const contentY = (originY - centerY - pan.y) / zoom;
    setPan({
      x: originX - centerX - contentX * nextZoom,
      y: originY - centerY - contentY * nextZoom,
    });
    setZoom(nextZoom);
  }

  function handleWheel(e: React.WheelEvent) {
    // Background scroll is already stopped by the body's overflow hidden, so
    // preventDefault isn't needed (React's wheel is registered passive, so
    // calling it has no effect anyway).
    applyZoom(zoom * (e.deltaY < 0 ? 1.2 : 1 / 1.2), e.clientX, e.clientY);
  }

  function handleMouseDown(e: React.MouseEvent) {
    if (zoom === 1 || e.button !== 0) return;
    e.preventDefault();
    panDragRef.current = {
      x: e.clientX,
      y: e.clientY,
      panX: pan.x,
      panY: pan.y,
    };
    setPanning(true);
  }
  function handleMouseMove(e: React.MouseEvent) {
    const d = panDragRef.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (Math.abs(dx) + Math.abs(dy) > 3) suppressClickRef.current = true;
    setPan({ x: d.panX + dx, y: d.panY + dy });
  }
  function handleMouseUp() {
    panDragRef.current = null;
    setPanning(false);
  }

  // Reset the zoom when the image changes.
  useEffect(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [currentId]);

  // Swipe left/right to move to the previous/next image. During a drag the image
  // follows the finger, and it snaps back if the movement is under the threshold.
  // It doesn't react when the vertical movement is larger. On a swipe the browser
  // doesn't fire a click, so it doesn't interfere with closing on a background
  // click.
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  // The last paging direction. The new image slides in matching that direction
  // (no animation on first display).
  const navDirRef = useRef<"next" | "prev" | null>(null);

  function navigate(dir: "next" | "prev") {
    const target = images[dir === "next" ? index + 1 : index - 1];
    if (!target) return;
    navDirRef.current = dir;
    onNavigate(target.id);
  }

  function handleTouchStart(e: React.TouchEvent) {
    if (zoom > 1) return;
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
    setDragX(resisted);
  }
  // Decide from the touch start/end coordinates, not from state (dragX). On a
  // fast flick, touchmove may not have been applied yet and dragX is stale.
  function handleTouchEnd(e: React.TouchEvent) {
    const start = touchStartRef.current;
    touchStartRef.current = null;
    setDragging(false);
    setDragX(0);
    const touch = e.changedTouches[0];
    if (!start || !touch) return;
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    if (Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy)) return;
    if (dx < 0 && hasNext) navigate("next");
    else if (dx > 0 && hasPrev) navigate("prev");
  }

  function handleTouchCancel() {
    touchStartRef.current = null;
    setDragging(false);
    setDragX(0);
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key === "i" || e.key === "I") {
        setShowInfo((v) => !v);
        return;
      }
      const dir =
        e.key === "ArrowLeft" && hasPrev
          ? "prev"
          : e.key === "ArrowRight" && hasNext
            ? "next"
            : null;
      if (!dir) return;
      const target = images[dir === "next" ? index + 1 : index - 1];
      if (!target) return;
      navDirRef.current = dir;
      onNavigate(target.id);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, hasPrev, hasNext, images, onClose, onNavigate]);

  // Stop background scrolling while the lightbox is shown.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  if (!current || typeof document === "undefined") return null;

  const createdAt = new Date(current.createdAt).toLocaleString(locale);

  return createPortal(
    // Close on background click. Escape closes it too (keydown is subscribed on
    // window).
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events
    <div
      className="fixed inset-0 z-50 flex touch-pan-y items-center justify-center bg-black/90 backdrop-blur-sm"
      onClick={(e) => {
        // Close only when the background itself is clicked (ignore clicks on
        // children).
        if (e.target !== e.currentTarget) return;
        // A drag while zoomed that ends over the background fires a click, so
        // don't close on that one.
        if (suppressClickRef.current) {
          suppressClickRef.current = false;
          return;
        }
        onClose();
      }}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchCancel}
      role="dialog"
      aria-modal="true"
      aria-label={t("viewer.lightbox.aria")}
    >
      <button
        type="button"
        className={cn(
          CTRL,
          "absolute top-3 right-3 z-10 size-10 rounded-full bg-white/10"
        )}
        title={t("action.close")}
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
      >
        <X className="size-5" aria-hidden />
        <span className="sr-only">{t("action.close")}</span>
      </button>

      {images.length > 1 && (
        <span className="absolute top-4 left-1/2 z-10 -translate-x-1/2 rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-medium text-white/90 tabular-nums">
          {index + 1} / {images.length}
        </span>
      )}

      {hasPrev && (
        <button
          type="button"
          className={cn(
            CTRL,
            "absolute top-1/2 left-2 z-10 size-11 -translate-y-1/2 bg-white/10 sm:left-4"
          )}
          title={t("viewer.nav.prev")}
          onClick={(e) => {
            e.stopPropagation();
            navigate("prev");
          }}
        >
          <ChevronLeft className="size-6" aria-hidden />
          <span className="sr-only">{t("viewer.nav.prev")}</span>
        </button>
      )}

      {/* Change key per image to apply a slide-in matching the paging direction.
          Follows the finger during a drag. */}
      <img
        key={current.id}
        ref={imgRef}
        src={resolveSrc(current)}
        alt=""
        draggable={false}
        style={{
          transform: `translate(${dragX + pan.x}px, ${pan.y}px) scale(${zoom})`,
        }}
        className={cn(
          "max-h-[90vh] max-w-[92vw] object-contain select-none",
          zoom > 1 && (panning ? "cursor-grabbing" : "cursor-grab"),
          !dragging && !panning && "transition-transform duration-200",
          !dragging &&
            navDirRef.current === "next" &&
            "animate-in fade-in slide-in-from-right-10 duration-200",
          !dragging &&
            navDirRef.current === "prev" &&
            "animate-in fade-in slide-in-from-left-10 duration-200"
        )}
        onDoubleClick={(e) => {
          // Double click toggles 1x <-> 2x (around the cursor position).
          applyZoom(zoom > 1 ? 1 : 2, e.clientX, e.clientY);
        }}
      />

      {hasNext && (
        <button
          type="button"
          className={cn(
            CTRL,
            "absolute top-1/2 right-2 z-10 size-11 -translate-y-1/2 bg-white/10 sm:right-4"
          )}
          title={t("viewer.nav.next")}
          onClick={(e) => {
            e.stopPropagation();
            navigate("next");
          }}
        >
          <ChevronRight className="size-6" aria-hidden />
          <span className="sr-only">{t("viewer.nav.next")}</span>
        </button>
      )}

      {/* Metadata panel (toggle with the i key). Overlaid subtly at the
      top-left. */}
      {showInfo && (
        <div className="absolute top-14 left-3 z-10 max-w-sm rounded-lg bg-black/70 p-3 text-xs text-white/90 backdrop-blur">
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
            <dt className="text-white/60">{t("viewer.info.prompt")}</dt>
            <dd className="max-h-24 overflow-y-auto break-words whitespace-pre-wrap">
              {current.prompt || "—"}
            </dd>
            <dt className="text-white/60">{t("viewer.info.model")}</dt>
            <dd>{current.model}</dd>
            <dt className="text-white/60">{t("viewer.info.size")}</dt>
            <dd className="tabular-nums">
              {current.width}×{current.height}
            </dd>
            <dt className="text-white/60">{t("viewer.info.seed")}</dt>
            <dd className="tabular-nums">{current.seed}</dd>
            <dt className="text-white/60">{t("viewer.info.steps")}</dt>
            <dd className="tabular-nums">{current.steps}</dd>
            <dt className="text-white/60">{t("viewer.info.scale")}</dt>
            <dd className="tabular-nums">{current.scale}</dd>
            <dt className="text-white/60">{t("viewer.info.sampler")}</dt>
            <dd>{current.sampler}</dd>
            <dt className="text-white/60">{t("viewer.info.createdAt")}</dt>
            <dd className="tabular-nums">{createdAt}</dd>
          </dl>
        </div>
      )}

      <div className="absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1 rounded-full bg-white/10 p-1 backdrop-blur">
        <button
          type="button"
          className={CTRL}
          title={t("viewer.action.download")}
          onClick={(e) => {
            e.stopPropagation();
            onDownload(current);
          }}
        >
          <Download className="size-5" aria-hidden />
          <span className="sr-only">{t("viewer.action.download")}</span>
        </button>
        <button
          type="button"
          className={CTRL}
          title={t("viewer.action.copyPrompt")}
          onClick={(e) => {
            e.stopPropagation();
            onCopyPrompt(current);
          }}
        >
          <ClipboardCopy className="size-5" aria-hidden />
          <span className="sr-only">{t("viewer.action.copyPrompt")}</span>
        </button>
        <button
          type="button"
          className={CTRL}
          title={t("viewer.action.copySeed")}
          onClick={(e) => {
            e.stopPropagation();
            onCopySeed(current);
          }}
        >
          <Hash className="size-5" aria-hidden />
          <span className="sr-only">{t("viewer.action.copySeed")}</span>
        </button>
        <button
          type="button"
          className={cn(CTRL, showInfo && "bg-white/20")}
          title={`${t("viewer.action.info")} (i)`}
          aria-pressed={showInfo}
          onClick={(e) => {
            e.stopPropagation();
            setShowInfo((v) => !v);
          }}
        >
          <Info className="size-5" aria-hidden />
          <span className="sr-only">{t("viewer.action.info")}</span>
        </button>
        <button
          type="button"
          className={cn(CTRL, "hover:bg-red-500/30")}
          title={t("action.delete")}
          onClick={(e) => {
            e.stopPropagation();
            onDelete(current);
          }}
        >
          <Trash2 className="size-5" aria-hidden />
          <span className="sr-only">{t("action.delete")}</span>
        </button>
      </div>
    </div>,
    document.body
  );
}
