"use client";

import { Button } from "@nai-desktop-studio/ui/components/button";
import { cn } from "@nai-desktop-studio/ui/lib/utils";
import {
  Columns2,
  Images,
  LayoutGrid,
  Loader2,
  PanelLeft,
  PanelLeftClose,
  Settings,
  Square,
  WandSparkles,
} from "lucide-react";

import { LocaleToggle } from "@/components/locale-toggle";
import { ModeToggle } from "@/components/mode-toggle";
import { Wordmark } from "@/components/wordmark";
import {
  useSettings,
  useSubscription,
} from "@/features/settings/hooks/queries";
import type { MessageKey } from "@/i18n/messages";
import { useT } from "@/i18n/provider";

import type { TileSize, ViewMode } from "../types/generate";

const TILE_SIZES: { value: TileSize; labelKey: MessageKey }[] = [
  { value: "s", labelKey: "workspace.tileSmall" },
  { value: "m", labelKey: "workspace.tileMedium" },
  { value: "l", labelKey: "workspace.tileLarge" },
];

type Props = {
  panelOpen: boolean;
  onTogglePanel: () => void;
  /** Mirrors the panel's generate button while the panel is closed. */
  canGenerate: boolean;
  isGenerating: boolean;
  anlasText: string | null;
  onGenerate: () => void;
  onCancel: () => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  tileSize: TileSize;
  onTileSizeChange: (size: TileSize) => void;
  onOpenLibrary: () => void;
  onOpenSettings: () => void;
};

export function WorkspaceHeader({
  panelOpen,
  onTogglePanel,
  canGenerate,
  isGenerating,
  anlasText,
  onGenerate,
  onCancel,
  viewMode,
  onViewModeChange,
  tileSize,
  onTileSizeChange,
  onOpenLibrary,
  onOpenSettings,
}: Props) {
  const t = useT();
  const { data: settings } = useSettings();
  const { data: subscription } = useSubscription(Boolean(settings?.hasApiKey));

  return (
    <header className="flex h-12 shrink-0 items-center justify-between gap-3 border-b px-3">
      <div className="flex items-center gap-2">
        {/* The header spans the whole window, so this keeps one screen position
            whether the panel is open or closed — open and close land on the same
            pixel and need no mouse travel. */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          title={
            panelOpen ? t("workspace.closePanel") : t("workspace.openPanel")
          }
          aria-expanded={panelOpen}
          onClick={onTogglePanel}
        >
          {panelOpen ? (
            <PanelLeftClose className="size-4" />
          ) : (
            <PanelLeft className="size-4" />
          )}
          <span className="sr-only">
            {panelOpen ? t("workspace.closePanel") : t("workspace.openPanel")}
          </span>
        </Button>
        <Wordmark />
        {subscription && (
          <span className="text-muted-foreground font-mono text-[11px] tabular-nums">
            {t("unit.anlas", { count: subscription.anlas.toLocaleString() })}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        {!panelOpen &&
          (isGenerating ? (
            <Button type="button" variant="outline" onClick={onCancel}>
              <Square className="mr-1.5 size-3.5 fill-current" />
              {t("generate.stop")}
            </Button>
          ) : (
            <Button
              type="button"
              className="gap-2"
              disabled={!canGenerate}
              onClick={onGenerate}
            >
              <WandSparkles className="size-4" />
              {t("generate.run")}
              <span className="font-mono text-[10px] font-semibold tabular-nums opacity-80">
                {anlasText ?? <Loader2 className="size-3 animate-spin" />}
              </span>
            </Button>
          ))}

        <div className="bg-muted/40 rounded-pill flex items-center gap-0.5 border p-0.5">
          <Button
            type="button"
            variant={viewMode === "single" ? "secondary" : "ghost"}
            size="icon"
            className="size-7"
            title={t("workspace.viewSingle")}
            onClick={() => onViewModeChange("single")}
          >
            <Columns2 className="size-4" />
            <span className="sr-only">{t("workspace.viewSingle")}</span>
          </Button>
          <Button
            type="button"
            variant={viewMode === "grid" ? "secondary" : "ghost"}
            size="icon"
            className="size-7"
            title={t("workspace.viewGrid")}
            onClick={() => onViewModeChange("grid")}
          >
            <Images className="size-4" />
            <span className="sr-only">{t("workspace.viewGrid")}</span>
          </Button>
        </div>

        {viewMode === "grid" && (
          <div className="bg-muted/40 rounded-pill flex items-center gap-0.5 border p-0.5">
            {TILE_SIZES.map((size) => (
              <button
                key={size.value}
                type="button"
                onClick={() => onTileSizeChange(size.value)}
                className={cn(
                  "rounded-pill font-display px-2 py-1 text-[11px] font-medium transition-colors duration-150 ease-out",
                  tileSize === size.value
                    ? "bg-secondary text-secondary-foreground shadow-segment"
                    : "text-muted-foreground hover:bg-accent/40 hover:text-foreground"
                )}
              >
                {t(size.labelKey)}
              </button>
            ))}
          </div>
        )}

        <Button
          type="button"
          variant="outline"
          size="icon"
          title={t("workspace.library")}
          onClick={onOpenLibrary}
        >
          <LayoutGrid className="size-4" />
          <span className="sr-only">{t("workspace.library")}</span>
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          title={t("workspace.settings")}
          onClick={onOpenSettings}
        >
          <Settings className="size-4" />
          <span className="sr-only">{t("workspace.settings")}</span>
        </Button>
        <LocaleToggle />
        <ModeToggle />
      </div>
    </header>
  );
}
