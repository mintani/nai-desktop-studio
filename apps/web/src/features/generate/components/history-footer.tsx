"use client";

import { useEffect, useMemo, useState } from "react";
import type { GeneratedImage } from "@/features/generate/types/image";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@nai-desktop-studio/ui/components/alert-dialog";
import { cn } from "@nai-desktop-studio/ui/lib/utils";
import {
  ChevronDown,
  ChevronUp,
  ImageIcon,
  Layers,
  Loader2,
  Trash2,
} from "lucide-react";
import {
  formatBatchTime,
  groupHistoryByBatch,
} from "@/features/generate/utils/history";
import { useI18n } from "@/i18n/provider";

const LS_HISTORY_COLLAPSED = "nai-generate-history-collapsed";

type Props = {
  historyStrip: GeneratedImage[];
  /** Converts a GeneratedImage to a display URL (path is server-relative). */
  resolveSrc: (image: GeneratedImage) => string;
  onSelectBatch: (images: GeneratedImage[]) => void;
  onClearHistory: () => void;
  /** Show an indicator on the history side too while generating. */
  isGenerating: boolean;
  /** Progress of the running batch. null when not generating. */
  generatingProgress: { done: number; total: number } | null;
};

export function HistoryFooter({
  historyStrip,
  resolveSrc,
  onSelectBatch,
  onClearHistory,
  isGenerating,
  generatingProgress,
}: Props) {
  const { t, locale } = useI18n();
  const [showConfirm, setShowConfirm] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setCollapsed(localStorage.getItem(LS_HISTORY_COLLAPSED) === "1");
  }, []);

  function toggleCollapsed() {
    const next = !collapsed;
    setCollapsed(next);
    try {
      localStorage.setItem(LS_HISTORY_COLLAPSED, next ? "1" : "0");
    } catch {
      // ignore quota / disabled storage
    }
  }

  const historyGroups = useMemo(
    () => groupHistoryByBatch(historyStrip),
    [historyStrip]
  );

  return (
    <>
      <footer
        className={cn(
          "bg-background flex shrink-0 flex-col border-t",
          !collapsed && "h-36"
        )}
      >
        <div className="border-border/60 flex shrink-0 items-center justify-between border-b px-3 py-1.5">
          <button
            type="button"
            onClick={toggleCollapsed}
            className="text-muted-foreground hover:text-foreground -ml-1 flex items-center gap-1.5 rounded px-1 transition-colors"
            title={
              collapsed
                ? t("viewer.history.expand")
                : t("viewer.history.collapse")
            }
            aria-expanded={!collapsed}
          >
            {collapsed ? (
              <ChevronUp className="size-3.5 shrink-0" aria-hidden />
            ) : (
              <ChevronDown className="size-3.5 shrink-0" aria-hidden />
            )}
            <span className="text-xs font-medium tracking-wide">
              {t("viewer.history.title")}
            </span>
            {historyStrip.length > 0 && (
              <span className="text-muted-foreground/70 text-[10px] tabular-nums">
                {historyGroups.length}
              </span>
            )}
          </button>
          {isGenerating && (
            <div className="text-primary mr-auto ml-2 flex items-center gap-1.5 text-[11px] font-medium">
              <Loader2 className="size-3.5 shrink-0 animate-spin" aria-hidden />
              <span>
                {generatingProgress && generatingProgress.total > 1
                  ? t("viewer.history.generatingCount", {
                      current: Math.min(
                        generatingProgress.done + 1,
                        generatingProgress.total
                      ),
                      total: generatingProgress.total,
                    })
                  : t("viewer.history.generating")}
              </span>
            </div>
          )}
          <button
            type="button"
            onClick={() => setShowConfirm(true)}
            disabled={historyStrip.length === 0}
            className="text-muted-foreground/60 hover:text-destructive transition-colors disabled:opacity-30"
            title={t("viewer.history.clear")}
          >
            <Trash2 className="size-3.5" />
            <span className="sr-only">{t("viewer.history.clear")}</span>
          </button>
        </div>
        {!collapsed && (
          <div className="min-h-0 flex-1 overflow-x-auto overflow-y-hidden px-3 py-2">
            {historyGroups.length === 0 && !isGenerating ? (
              <div className="text-muted-foreground/70 flex h-full items-center justify-center gap-2 text-xs">
                <ImageIcon className="size-4 opacity-50" />
                {t("viewer.history.empty")}
              </div>
            ) : (
              <div className="flex h-full items-center gap-2">
                {isGenerating && (
                  <div
                    className="border-primary/40 bg-primary/5 relative flex aspect-[3/4] h-full flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed p-1.5"
                    title={t("viewer.history.generating")}
                  >
                    <Loader2
                      className="text-primary size-6 animate-spin"
                      aria-hidden
                    />
                    <span className="text-primary text-[10px] font-medium tabular-nums">
                      {generatingProgress && generatingProgress.total > 1
                        ? `${Math.min(generatingProgress.done + 1, generatingProgress.total)}/${generatingProgress.total}`
                        : t("viewer.history.generating")}
                    </span>
                  </div>
                )}
                {historyGroups.map((group) => {
                  const total = group.images.length;
                  const visible = group.images.slice(0, 4);
                  // Size the mosaic to the batch. Padding one or two thumbnails
                  // out to a 2x2 grid with blanks reads as a batch that lost
                  // images.
                  const columns = visible.length === 1 ? 1 : 2;
                  const rows = visible.length > 2 ? 2 : 1;
                  const emptyCount = Math.max(
                    0,
                    columns * rows - visible.length
                  );
                  const hasMore = total > 4;
                  return (
                    <button
                      key={group.batchId}
                      type="button"
                      onClick={() => onSelectBatch(group.images)}
                      title={`${formatBatchTime(group.createdAt, locale)} · ${t("unit.images", { count: total })}`}
                      className="border-border/50 bg-muted/40 hover:border-border hover:bg-muted/70 relative aspect-[3/4] h-full cursor-pointer rounded-lg border p-1.5 transition-colors"
                    >
                      <div
                        className={cn(
                          "grid h-full w-full gap-0.5",
                          columns === 1 ? "grid-cols-1" : "grid-cols-2",
                          rows === 1 ? "grid-rows-1" : "grid-rows-2"
                        )}
                      >
                        {visible.map((img) => (
                          <div
                            key={img.id}
                            className="bg-muted relative overflow-hidden rounded-[3px]"
                          >
                            <img
                              src={resolveSrc(img)}
                              loading="lazy"
                              decoding="async"
                              alt=""
                              className="size-full object-cover"
                            />
                          </div>
                        ))}
                        {Array.from({ length: emptyCount }).map((_, i) => (
                          <div
                            key={`e-${i}`}
                            className="bg-muted/40 rounded-[3px]"
                          />
                        ))}
                      </div>
                      {hasMore && (
                        <div className="bg-foreground/85 text-background absolute top-1 right-1 inline-flex items-center gap-0.5 rounded-full py-0.5 pr-1.5 pl-1 text-[10px] leading-none font-semibold tabular-nums">
                          <Layers className="size-2.5" strokeWidth={2.5} />
                          {total}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </footer>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("viewer.history.clearTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("viewer.history.clearDescription", {
                count: historyStrip.length,
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("action.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                onClearHistory();
                setShowConfirm(false);
              }}
            >
              {t("action.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
