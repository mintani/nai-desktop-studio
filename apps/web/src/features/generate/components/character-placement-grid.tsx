"use client";

import { Button } from "@nai-desktop-studio/ui/components/button";
import { cn } from "@nai-desktop-studio/ui/lib/utils";
import { X } from "lucide-react";

import { assetUrl } from "@/features/library/collections";
import { useT } from "@/i18n/provider";

import { POSITION_GRID } from "../constants";
import { cellCenter, describePosition, snapToCell } from "../lib/placement";
import type { PlacementPoint } from "../types/generate";

export type PlacementEntry = {
  id: string;
  /** Names the one being placed. Falls back to the cell badge when there is no picture. */
  label: string;
  /** A1..E5 or a free point (V5), or null to let NovelAI choose. */
  position: string | PlacementPoint | null;
  /** The character's picture, when it has one. Hand-typed characters do not. */
  imagePath?: string | null;
};

type Props = {
  entries: PlacementEntry[];
  activeId: string | null;
  onActiveChange: (id: string) => void;
  onPositionChange: (
    id: string,
    position: string | PlacementPoint | null
  ) => void;
  /** width / height of the image being made. The frame takes the same shape. */
  aspect: number;
  /** V5 places anywhere on the frame; the grid is for models that cannot. */
  freeform: boolean;
  className?: string;
};

const CELLS = POSITION_GRID.flat();
const COLUMNS = POSITION_GRID[0]?.length ?? 5;

/**
 * The frame's width, picked from its shape so no cell gets thin.
 *
 * A single max-width would make the portrait frame very tall and the landscape
 * one very flat — one shape's comfortable width is the other's cramped one.
 * Three buckets keep every cell over ~38px in both directions.
 */
function frameWidth(aspect: number) {
  if (aspect >= 1.2) return "max-w-72";
  if (aspect <= 0.85) return "max-w-52";
  return "max-w-60";
}

/** Finer than anyone can aim, and it keeps the request numbers readable. */
function roundCoordinate(value: number) {
  return Math.round(Math.min(Math.max(value, 0), 1) * 100) / 100;
}

/** What a grid surface treats a position as: free points snap to their cell. */
function cellOf(position: PlacementEntry["position"]) {
  return position && typeof position !== "string"
    ? snapToCell(position)
    : position;
}

/**
 * Where the characters stand, drawn as the picture that is about to be made.
 *
 * The frame takes the aspect of the chosen size, so A1 is the top-left of the
 * real image and a tall picture gets tall cells. A square keypad for a 832x1216
 * portrait described nothing — it was 25 buttons that happened to be arranged
 * five by five.
 *
 * Everyone shares one frame: what is being decided is who stands where relative
 * to everyone else, and a grid per character shows exactly the thing that
 * matters least. Characters appear as their own picture where they have one,
 * which is a better answer to "who is that" than a number.
 *
 * Clicking a cell places the active character and moves on to the next, so a
 * cast is laid out with one click each. Clicking the active character's own cell
 * takes it back off the frame — a position turns on use_coords, which tends to
 * lock the framing, so "anywhere" has to stay reachable.
 */
export function CharacterPlacementGrid({
  entries,
  activeId,
  onActiveChange,
  onPositionChange,
  aspect,
  freeform,
  className,
}: Props) {
  const t = useT();

  const activeIndex = entries.findIndex((entry) => entry.id === activeId);
  const active = entries[activeIndex] ?? null;
  const untouched = entries.every((entry) => entry.position === null);

  function place(position: string | PlacementPoint | null) {
    if (!active) return;
    onPositionChange(active.id, position);
    const next = entries[activeIndex + 1];
    if (position !== null && next) onActiveChange(next.id);
  }

  return (
    <div className={cn("space-y-1.5", className)}>
      {/* Who is being placed and where they stand, on one line above the frame.
          The eye needs that answer while looking at the frame, not in a list
          further down the panel. */}
      <div className="flex min-h-6 items-center gap-1.5">
        {active ? (
          <>
            <Occupant entry={active} index={activeIndex} active />
            <span className="min-w-0 flex-1 truncate text-[11px] font-medium">
              {active.label}
            </span>
            {active.position ? (
              <>
                <span className="text-muted-foreground shrink-0 font-mono text-[10px] tabular-nums">
                  {describePosition(active.position, freeform)}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  className="text-muted-foreground hover:text-foreground shrink-0"
                  onClick={() => place(null)}
                  title={t("generate.placement.clear")}
                >
                  <X aria-hidden />
                  <span className="sr-only">
                    {t("generate.placement.clear")}
                  </span>
                </Button>
              </>
            ) : (
              <span className="text-muted-foreground/70 shrink-0 text-[10px]">
                {t("generate.placement.none")}
              </span>
            )}
          </>
        ) : (
          <span className="text-muted-foreground text-[11px]">
            {t("generate.placement.hintEmpty")}
          </span>
        )}
      </div>

      {freeform ? (
        // The same frame with no cells: V5 takes the exact spot, so the frame
        // is a surface, not a keypad. A position set on the grid before the
        // model switch shows at its cell's center until it is placed again.
        <div
          style={{ aspectRatio: aspect }}
          className={cn(
            "bg-muted/30 relative mx-auto w-full overflow-hidden rounded-md border",
            frameWidth(aspect)
          )}
        >
          <button
            type="button"
            disabled={!active}
            title={
              active
                ? t("generate.placement.point", { name: active.label })
                : undefined
            }
            onClick={(event) => {
              // A keyboard "click" carries no coordinates (detail 0); give it
              // the center rather than the frame's top-left corner.
              if (event.detail === 0) {
                place({ x: 0.5, y: 0.5 });
                return;
              }
              const frame = event.currentTarget.getBoundingClientRect();
              place({
                x: roundCoordinate((event.clientX - frame.left) / frame.width),
                y: roundCoordinate((event.clientY - frame.top) / frame.height),
              });
            }}
            className="focus-visible:ring-ring hover:bg-muted/70 absolute inset-0 cursor-crosshair outline-none transition-colors duration-150 ease-out focus-visible:ring-1 focus-visible:ring-inset disabled:pointer-events-none"
          >
            <span className="sr-only">
              {active
                ? t("generate.placement.point", { name: active.label })
                : ""}
            </span>
          </button>
          {entries.map((entry, order) => {
            if (!entry.position) return null;
            const point =
              typeof entry.position === "string"
                ? cellCenter(entry.position)
                : entry.position;
            return (
              <span
                key={entry.id}
                className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
                style={{
                  left: `${point.x * 100}%`,
                  top: `${point.y * 100}%`,
                }}
              >
                <Occupant
                  entry={entry}
                  index={order}
                  active={entry.id === activeId}
                />
              </span>
            );
          })}
        </div>
      ) : (
        // One bordered frame divided by hairlines, not 25 bordered boxes. A
        // viewfinder's grid is an overlay on the picture; boxes with gaps read
        // as a keypad.
        <div
          style={{ aspectRatio: aspect }}
          className={cn(
            "bg-muted/30 mx-auto grid w-full grid-cols-5 grid-rows-5 overflow-hidden rounded-md border",
            frameWidth(aspect)
          )}
        >
          {CELLS.map((cell, index) => {
            const here = entries
              .map((entry, order) => ({ entry, order }))
              .filter(({ entry }) => cellOf(entry.position) === cell);
            const isActiveCell = active
              ? cellOf(active.position) === cell
              : false;
            const lastColumn = index % COLUMNS === COLUMNS - 1;
            const lastRow = index >= CELLS.length - COLUMNS;

            return (
              <button
                key={cell}
                type="button"
                disabled={!active}
                aria-pressed={isActiveCell}
                onClick={() => place(isActiveCell ? null : cell)}
                title={
                  active
                    ? t("generate.placement.cell", { name: active.label, cell })
                    : cell
                }
                className={cn(
                  "focus-visible:ring-ring border-border/60 relative flex items-center justify-center gap-0.5 outline-none transition-colors duration-150 ease-out focus-visible:z-10 focus-visible:ring-1 focus-visible:ring-inset disabled:pointer-events-none",
                  !lastColumn && "border-r",
                  !lastRow && "border-b",
                  // The same pair as every other chosen option — secondary fill,
                  // primary edge — said with an inset ring, because the cell has
                  // no border of its own to turn.
                  isActiveCell
                    ? "bg-secondary ring-primary z-10 ring-1 ring-inset"
                    : "hover:bg-muted/70"
                )}
              >
                {here.map(({ entry, order }) => (
                  <Occupant
                    key={entry.id}
                    entry={entry}
                    index={order}
                    active={entry.id === activeId}
                  />
                ))}
                <span className="sr-only">{cell}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Only until the first one is placed. The auto-advance is worth saying
          once; repeating it forever turns instructions into furniture. */}
      {active && untouched && (
        <p className="text-muted-foreground/80 text-[10px] leading-snug">
          {t(
            freeform ? "generate.placement.hintFree" : "generate.placement.hint"
          )}
        </p>
      )}
    </div>
  );
}

/**
 * One character on the frame: their picture where there is one, their order
 * number where there is not. A face answers "who is that" better than a number,
 * and the order is on the list beside the frame either way.
 */
function Occupant({
  entry,
  index,
  active,
}: {
  entry: PlacementEntry;
  index: number;
  active: boolean;
}) {
  if (entry.imagePath) {
    return (
      <img
        src={assetUrl(entry.imagePath)}
        alt=""
        draggable={false}
        className={cn(
          "size-6 shrink-0 rounded-full object-cover select-none",
          active ? "ring-primary ring-2" : "ring-background ring-1"
        )}
      />
    );
  }

  return (
    <span
      className={cn(
        "flex size-5 shrink-0 items-center justify-center rounded-full font-mono text-[10px] font-semibold tabular-nums",
        active
          ? "bg-primary text-primary-foreground"
          : "bg-muted-foreground/60 text-background"
      )}
    >
      {index + 1}
    </span>
  );
}
