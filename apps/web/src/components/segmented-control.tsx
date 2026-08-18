"use client";

import { cn } from "@nai-desktop-studio/ui/lib/utils";

type Option<T extends string> = {
  value: T;
  label: string;
  disabled?: boolean;
};

type Props<T extends string> = {
  /** Names the group for screen readers. The track carries no visible label. */
  label: string;
  value: T;
  options: Option<T>[];
  onChange: (value: T) => void;
  className?: string;
};

/**
 * A track of mutually exclusive faces. It is 32px tall so it lines up with the
 * selects beside it, and the face radius is derived from the track's so the two
 * curves stay concentric.
 *
 * The selected face is filled with the aqua secondary, the same way the
 * resolution and count buttons show their choice. A white face would only lift
 * in light mode — secondary is lighter than the panel in dark and darker in
 * light, so it reads as chosen either way. Hovering fades the same fill in.
 */
export function SegmentedControl<T extends string>({
  label,
  value,
  options,
  onChange,
  className,
}: Props<T>) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        "bg-muted/40 flex h-8 gap-0.5 rounded-sm border p-0.5",
        className
      )}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            disabled={option.disabled}
            aria-pressed={selected}
            onClick={() => onChange(option.value)}
            className={cn(
              "font-display focus-visible:ring-ring/50 flex-1 rounded-[calc(var(--radius-sm)-2px)] text-xs font-medium transition-[color,background-color,box-shadow] duration-150 ease-out outline-none focus-visible:ring-1",
              option.disabled
                ? "cursor-not-allowed opacity-40"
                : selected
                  ? "bg-secondary text-secondary-foreground shadow-segment"
                  : "text-muted-foreground hover:bg-accent/40 hover:text-foreground"
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
