import type { PlacementPoint } from "../types/generate";

/**
 * V5 places characters anywhere on the frame; V4-series models only know the
 * 5x5 grid.
 */
export function supportsFreePlacement(model: string) {
  return model.startsWith("nai-diffusion-5");
}

/** Center of a grid cell like "B2" in 0-1 coordinates. */
export function cellCenter(cell: string): PlacementPoint {
  const column = "ABCDE".indexOf(cell.charAt(0));
  const row = "12345".indexOf(cell.charAt(1));
  return { x: (column + 0.5) / 5, y: (row + 0.5) / 5 };
}

/**
 * The grid cell a free point falls in, for surfaces and models that only know
 * the grid.
 */
export function snapToCell(point: PlacementPoint): string {
  const cap = (value: number) =>
    Math.min(Math.max(Math.floor(value * 5), 0), 4);
  return `${"ABCDE".charAt(cap(point.x))}${cap(point.y) + 1}`;
}

/**
 * The position a request may carry for this model. A free point placed on V5
 * snaps to its grid cell when the model is switched to one that only knows
 * the grid, so the request stays one the model understands.
 */
export function resolvePlacement(
  position: string | PlacementPoint,
  model: string
) {
  if (typeof position === "string" || supportsFreePlacement(model)) {
    return position;
  }
  return snapToCell(position);
}

/**
 * How a position reads in the UI. A free point shows as percentages of the
 * frame; on a grid surface it shows as the cell it snaps to, so the label
 * matches what the frame draws and what the request will carry.
 */
export function describePosition(
  position: string | PlacementPoint,
  freeform: boolean
): string {
  if (typeof position === "string") return position;
  if (!freeform) return snapToCell(position);
  return `${Math.round(position.x * 100)}%, ${Math.round(position.y * 100)}%`;
}
