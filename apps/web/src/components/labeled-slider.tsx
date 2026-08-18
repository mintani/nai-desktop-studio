"use client";

import { Label } from "@nai-desktop-studio/ui/components/label";
import { Slider } from "@nai-desktop-studio/ui/components/slider";

const pickValue = (value: number | readonly number[], fallback: number) =>
  typeof value === "number" ? value : (value[0] ?? fallback);

// base-ui's snap calculation produces errors like 10.000000000000002. Without
// rounding to the step's decimal places, the value can trip the server-side max
// check or trigger a re-encode even though it hasn't changed.
const snapToStep = (value: number, step: number) =>
  Number(
    value.toFixed(step < 1 ? (String(step).split(".")[1]?.length ?? 0) : 0)
  );

type Props = {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  /** Called once when the drag settles (pointer up). */
  onCommit?: (value: number) => void;
  format?: (value: number) => string;
};

/**
 * Label + current value + slider as a set. base-ui's Slider decides the number
 * of thumbs from the length of the value array, so a single thumb must always be
 * passed as an array (a bare number yields two thumbs at min/max).
 */
export function LabeledSlider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  onCommit,
  format,
}: Props) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-[11px]">{label}</Label>
        <span className="text-muted-foreground text-[11px] tabular-nums">
          {format ? format(value) : value}
        </span>
      </div>
      <Slider
        min={min}
        max={max}
        step={step}
        value={[value]}
        onValueChange={(next) =>
          onChange(snapToStep(pickValue(next, value), step))
        }
        onValueCommitted={
          onCommit
            ? (next) => onCommit(snapToStep(pickValue(next, value), step))
            : undefined
        }
      />
    </div>
  );
}
