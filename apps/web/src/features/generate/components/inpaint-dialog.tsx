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
import { Eraser, Paintbrush, Undo2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { LabeledSlider } from "@/components/labeled-slider";
import { SegmentedControl } from "@/components/segmented-control";
import { useT } from "@/i18n/provider";

/** What the dialog is opened with. */
export type InpaintTarget = {
  previewUrl: string;
  imageBase64: string;
  /** An existing mask, when the dialog is reopened to adjust one. */
  maskBase64: string | null;
};

type Props = {
  target: InpaintTarget | null;
  onSave: (maskBase64: string) => void;
  onCancel: () => void;
};

const MIN_BRUSH = 8;
const MAX_BRUSH = 240;
const DEFAULT_BRUSH = 64;

/**
 * Paints the mask that says which part of an image gets redrawn.
 *
 * The mask is kept on its own canvas at the image's real pixel size, painted
 * white on transparent, and only flattened onto black when it is saved. That
 * keeps what is shown and what is sent the same thing: what is drawn here at a
 * fitted size is what NovelAI receives at full size, with no second scaling
 * step to disagree about.
 */
export function InpaintDialog({ target, onSave, onCancel }: Props) {
  const t = useT();
  const maskRef = useRef<HTMLCanvasElement | null>(null);
  const viewRef = useRef<HTMLCanvasElement | null>(null);
  const painting = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const [brush, setBrush] = useState(DEFAULT_BRUSH);
  const [tool, setTool] = useState<"paint" | "erase">("paint");
  const [size, setSize] = useState<{ width: number; height: number } | null>(
    null
  );
  const [painted, setPainted] = useState(false);

  // Build the mask canvas from the image, and from an existing mask when one
  // is being adjusted rather than started.
  useEffect(() => {
    if (!target) {
      setSize(null);
      setPainted(false);
      return;
    }
    let cancelled = false;
    const image = new Image();
    image.onload = () => {
      if (cancelled) return;
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      maskRef.current = canvas;
      setSize({ width: canvas.width, height: canvas.height });

      if (!target.maskBase64) {
        setPainted(false);
        return;
      }
      // A saved mask is black where nothing happens, so only the white is
      // brought back — painting straight over black would fill everything.
      const previous = new Image();
      previous.onload = () => {
        if (cancelled) return;
        const context = canvas.getContext("2d");
        if (!context) return;
        context.drawImage(previous, 0, 0, canvas.width, canvas.height);
        const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
        for (let i = 0; i < pixels.data.length; i += 4) {
          const white = (pixels.data[i] ?? 0) > 127;
          pixels.data[i] = 255;
          pixels.data[i + 1] = 255;
          pixels.data[i + 2] = 255;
          pixels.data[i + 3] = white ? 255 : 0;
        }
        context.putImageData(pixels, 0, 0);
        setPainted(true);
        draw();
      };
      previous.src = `data:image/png;base64,${target.maskBase64}`;
    };
    image.src = target.previewUrl;
    return () => {
      cancelled = true;
    };
  }, [target]);

  /**
   * Mirror the mask onto the visible canvas, over the image.
   *
   * Tinted here and only here. White at half opacity disappears into a bright
   * picture, and the one thing this screen has to show is exactly which pixels
   * are marked. What gets saved stays black and white.
   */
  function draw() {
    const view = viewRef.current;
    const mask = maskRef.current;
    if (!view || !mask) return;
    const context = view.getContext("2d");
    if (!context) return;
    context.clearRect(0, 0, view.width, view.height);
    context.drawImage(mask, 0, 0, view.width, view.height);

    const accent = getComputedStyle(document.documentElement)
      .getPropertyValue("--primary")
      .trim();
    if (!accent) return;
    context.save();
    // Paint the accent through the mask's own alpha, so only what was drawn
    // takes the colour.
    context.globalCompositeOperation = "source-in";
    context.fillStyle = accent;
    context.fillRect(0, 0, view.width, view.height);
    context.restore();
  }

  function pointOn(event: React.PointerEvent<HTMLCanvasElement>) {
    const view = event.currentTarget;
    const rect = view.getBoundingClientRect();
    const mask = maskRef.current;
    if (!mask) return null;
    return {
      x: ((event.clientX - rect.left) / rect.width) * mask.width,
      y: ((event.clientY - rect.top) / rect.height) * mask.height,
    };
  }

  function stroke(to: { x: number; y: number }) {
    const mask = maskRef.current;
    const context = mask?.getContext("2d");
    if (!mask || !context) return;

    context.save();
    context.globalCompositeOperation =
      tool === "erase" ? "destination-out" : "source-over";
    context.strokeStyle = "#ffffff";
    context.fillStyle = "#ffffff";
    context.lineWidth = brush;
    context.lineCap = "round";
    context.lineJoin = "round";

    const from = last.current ?? to;
    context.beginPath();
    context.moveTo(from.x, from.y);
    context.lineTo(to.x, to.y);
    context.stroke();
    // A single tap draws no line, so put a dot down as well.
    context.beginPath();
    context.arc(to.x, to.y, brush / 2, 0, Math.PI * 2);
    context.fill();
    context.restore();

    last.current = to;
    setPainted(true);
    draw();
  }

  function clear() {
    const mask = maskRef.current;
    const context = mask?.getContext("2d");
    if (!mask || !context) return;
    context.clearRect(0, 0, mask.width, mask.height);
    setPainted(false);
    draw();
  }

  /** Flatten onto black: that is the shape NovelAI takes. */
  function save() {
    const mask = maskRef.current;
    if (!mask) return;
    const out = document.createElement("canvas");
    out.width = mask.width;
    out.height = mask.height;
    const context = out.getContext("2d");
    if (!context) return;
    context.fillStyle = "#000000";
    context.fillRect(0, 0, out.width, out.height);
    context.drawImage(mask, 0, 0);
    onSave(out.toDataURL("image/png").split(",")[1] ?? "");
  }

  return (
    <Dialog
      open={target !== null}
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
    >
      <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{t("inpaint.title")}</DialogTitle>
          <DialogDescription>{t("inpaint.description")}</DialogDescription>
        </DialogHeader>

        <div className="bg-canvas flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-md border p-2">
          {target && size && (
            <div
              className="relative max-h-full"
              style={{ aspectRatio: `${size.width} / ${size.height}` }}
            >
              <img
                src={target.previewUrl}
                alt=""
                className="block max-h-[55vh] w-auto rounded-sm select-none"
                draggable={false}
              />
              {/* Sits exactly on the image. White strokes at half opacity read
                  as a haze over what will change, without hiding it. */}
              <canvas
                ref={viewRef}
                width={size.width}
                height={size.height}
                className="absolute inset-0 size-full cursor-crosshair rounded-sm opacity-70"
                onPointerDown={(event) => {
                  event.currentTarget.setPointerCapture(event.pointerId);
                  painting.current = true;
                  last.current = null;
                  const point = pointOn(event);
                  if (point) stroke(point);
                }}
                onPointerMove={(event) => {
                  if (!painting.current) return;
                  const point = pointOn(event);
                  if (point) stroke(point);
                }}
                onPointerUp={() => {
                  painting.current = false;
                  last.current = null;
                }}
                onPointerLeave={() => {
                  painting.current = false;
                  last.current = null;
                }}
              />
            </div>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-3">
          <SegmentedControl
            label={t("inpaint.tool")}
            value={tool}
            options={[
              { value: "paint", label: t("inpaint.paint") },
              { value: "erase", label: t("inpaint.erase") },
            ]}
            onChange={setTool}
          />
          <div className="min-w-40 flex-1">
            <LabeledSlider
              label={t("inpaint.brush")}
              value={brush}
              min={MIN_BRUSH}
              max={MAX_BRUSH}
              step={2}
              onChange={setBrush}
              format={(value) => `${Math.round(value)} px`}
            />
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!painted}
            onClick={clear}
          >
            <Undo2 className="mr-1 size-3.5" aria-hidden />
            {t("inpaint.clear")}
          </Button>
        </div>

        <div className="flex shrink-0 items-center justify-between gap-2 border-t pt-3">
          <span
            className={cn(
              "text-xs",
              painted ? "text-muted-foreground" : "text-destructive"
            )}
          >
            {painted ? t("inpaint.ready") : t("inpaint.needMask")}
          </span>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
              {t("action.cancel")}
            </Button>
            <Button type="button" size="sm" disabled={!painted} onClick={save}>
              {tool === "erase" ? (
                <Eraser className="mr-1 size-3.5" aria-hidden />
              ) : (
                <Paintbrush className="mr-1 size-3.5" aria-hidden />
              )}
              {t("inpaint.save")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
