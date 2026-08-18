import { cn } from "@nai-desktop-studio/ui/lib/utils";

/**
 * The app's wordmark. No symbol — set in type only. `nai-desktop-` is muted and
 * `studio` is emphasized, giving the long spelling a center of gravity.
 */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "font-display text-[15px] font-semibold tracking-tight",
        className
      )}
    >
      <span className="text-muted-foreground">nai-desktop-</span>
      <span>studio</span>
    </span>
  );
}
