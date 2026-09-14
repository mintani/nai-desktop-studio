"use client";

import { Button } from "@nai-desktop-studio/ui/components/button";

import { useT } from "@/i18n/provider";

import { useDownloadModel } from "../hooks/queries";
import type { ModelStatus } from "../lib/api";

/** Megabytes, the unit the registry's byte counts are quoted in. */
function megabytes(bytes: number) {
  return (bytes / 1_000_000).toFixed(1);
}

/**
 * One model's line: how big it is, and the one thing left to do about it.
 *
 * The models are far too large to ship with the app, so a section that needs
 * one opens on this row instead of its results. Progress is the server's byte
 * count rather than a spinner — a 735 MB fetch has to look like it is moving.
 */
export function ModelStatusRow({ model }: { model: ModelStatus }) {
  const t = useT();
  const download = useDownloadModel();
  const percent =
    model.bytes > 0 ? Math.min((model.received / model.bytes) * 100, 100) : 0;

  return (
    <div className="space-y-1.5 rounded-md border p-2">
      <div className="flex items-center gap-2">
        <span className="min-w-0 flex-1 truncate text-xs font-medium">
          {model.label}
        </span>
        <span className="text-muted-foreground font-mono text-[0.625rem] tabular-nums">
          {t("analysis.model.size", { size: megabytes(model.bytes) })}
        </span>
        {model.ready ? (
          <span className="text-muted-foreground text-[0.625rem]">
            {t("analysis.model.ready")}
          </span>
        ) : (
          !model.downloading && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={download.isPending}
              onClick={() => download.mutate(model.id)}
            >
              {model.error
                ? t("analysis.model.retry")
                : t("analysis.model.download")}
            </Button>
          )
        )}
      </div>

      {model.downloading && (
        <div className="flex items-center gap-2">
          <div className="bg-muted rounded-pill h-1.5 min-w-0 flex-1 overflow-hidden">
            <div
              className="bg-primary rounded-pill h-full"
              style={{ width: `${percent}%` }}
            />
          </div>
          <span className="text-muted-foreground font-mono text-[0.625rem] tabular-nums">
            {percent.toFixed(1)}%
          </span>
        </div>
      )}

      {model.error && (
        <p className="text-destructive text-[0.625rem] leading-tight">
          {model.error}
        </p>
      )}

      {!model.ready && (
        <p className="text-muted-foreground text-[0.625rem] leading-tight">
          {t("analysis.model.hint")}
        </p>
      )}
    </div>
  );
}
