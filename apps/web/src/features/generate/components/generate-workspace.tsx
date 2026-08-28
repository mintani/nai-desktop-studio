"use client";

import { cn } from "@nai-desktop-studio/ui/lib/utils";
import { ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { MessageKey } from "@/i18n/messages";
import { useT } from "@/i18n/provider";

import { useCharacters } from "@/features/characters/hooks/queries";
import { useReferences } from "@/features/reference-library/hooks/queries";
import { SettingsDialog } from "@/features/settings/components/settings-dialog";
import { useSettings } from "@/features/settings/hooks/queries";
import { useSituations } from "@/features/situations/hooks/queries";
import { useStyles } from "@/features/styles/hooks/queries";
import type { Style } from "@/features/styles/types/style";

import { INITIAL_FORM, MODEL_OPTIONS } from "../constants";
import { useAnlasEstimate } from "../hooks/use-anlas-estimate";
import { useGenerationEngine } from "../hooks/use-generation-engine";
import { useImageLibrary } from "../hooks/use-image-library";
import { supportsReferences, supportsVibes } from "../lib/build-request";
import { assessReferenceSpend } from "../lib/assess-spend";
import { pickedLibraryReferences } from "../lib/library-references";
import { fetchVibeCacheStatus, hashVibeImage } from "../lib/vibe-cache";
import {
  COMPOSED_PROMPT_FLAGS,
  composeTemplateJobs,
  styleParamOverrides,
  type GenerationJob,
  type SelectedCharacter,
} from "../lib/compose";
import { loadStyleReferenceImages } from "../lib/style-references";
import {
  copyToClipboard,
  downloadImage,
  resolveImageSrc,
  resolveThumbSrc,
} from "../lib/image-actions";
import type {
  FormState,
  GenerationMode,
  TileSize,
  ViewMode,
} from "../types/generate";
import type { GeneratedImage, GenerationSlot } from "../types/image";
import { EMPTY_TEMPLATE_SELECTION } from "../types/template";
import type { TemplateSelection } from "../types/template";
import { AnlasConfirmDialog } from "./anlas-confirm-dialog";
import type { ReferenceCost } from "./anlas-confirm-dialog";
import { GeneratePanel } from "./generate-panel";
import { HistoryFooter } from "./history-footer";
import { ImageGrid } from "./image-grid";
import { ImageLightbox } from "./image-lightbox";
import { LibraryDialog } from "./library-dialog";
import { SingleImageView } from "./single-image-view";
import { WorkspaceHeader } from "./workspace-header";

function toSlots(images: GeneratedImage[]): GenerationSlot[] {
  return images.map((image) => ({
    key: image.id,
    image,
    previewDataUrl: null,
    aspect: image.width / image.height,
  }));
}

const PANEL_STORAGE_KEY = "nai-panel-open";
const MODE_STORAGE_KEY = "nai-generation-mode";

export function GenerateWorkspace() {
  const t = useT();
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const { data: settings } = useSettings();

  // The saved default model, applied once when settings arrive. Only while the
  // form still holds the built-in fallback: a model the person already picked
  // in the first moments must not be snatched back.
  const appliedDefaultModel = useRef(false);
  useEffect(() => {
    if (appliedDefaultModel.current || !settings) return;
    appliedDefaultModel.current = true;
    const saved = MODEL_OPTIONS.find(
      (option) => option.value === settings.defaultModel
    )?.value;
    if (!saved) return;
    setForm((current) =>
      current.model === INITIAL_FORM.model
        ? { ...current, model: saved }
        : current
    );
  }, [settings]);
  const { situations: situationList } = useSituations();
  const { characters: characterList } = useCharacters();
  const { styles: styleList } = useStyles();
  const [mode, setMode] = useState<GenerationMode>("normal");
  // Kept here rather than in the panel: the panel unmounts when the sidebar is
  // closed, and the picked template should survive that.
  const [templateSelection, setTemplateSelection] = useState<TemplateSelection>(
    EMPTY_TEMPLATE_SELECTION
  );
  const [panelOpen, setPanelOpen] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("single");
  const [tileSize, setTileSize] = useState<TileSize>("m");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [lightboxId, setLightboxId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  // Batch picked from history. Reset to null when generation starts so the
  // running slots take over the display.
  const [viewedBatch, setViewedBatch] = useState<GeneratedImage[] | null>(null);

  useEffect(() => {
    setPanelOpen(localStorage.getItem(PANEL_STORAGE_KEY) !== "0");
    if (localStorage.getItem(MODE_STORAGE_KEY) === "batch") setMode("batch");
  }, []);

  function changeMode(next: GenerationMode) {
    setMode(next);
    try {
      localStorage.setItem(MODE_STORAGE_KEY, next);
    } catch {
      // ignore quota / disabled storage
    }
  }

  function togglePanel() {
    setPanelOpen((open) => {
      const next = !open;
      try {
        localStorage.setItem(PANEL_STORAGE_KEY, next ? "1" : "0");
      } catch {
        // ignore quota / disabled storage
      }
      return next;
    });
  }

  const library = useImageLibrary();
  const engine = useGenerationEngine({ onImageSaved: library.addImage });
  // In batch mode one press covers every picked scene, so the button's figure
  // has to count them all.
  const plannedImages =
    mode === "batch"
      ? templateSelection.situationIds.length * form.nSamples
      : form.nSamples;
  const { anlasText } = useAnlasEstimate(form, plannedImages);
  // Jobs waiting on the Anlas confirmation. Held rather than rebuilt on
  // confirm so the run is exactly what the figures were quoted for.
  const [pendingJobs, setPendingJobs] = useState<GenerationJob[] | null>(null);
  const [pendingCost, setPendingCost] = useState<ReferenceCost | null>(null);
  const { references: libraryReferences } = useReferences();

  const update = useCallback((patch: Partial<FormState>) => {
    setForm((current) => {
      const next = { ...current, ...patch };
      // Precise reference is V4.5-only. When switching to an unsupported model,
      // fall back to vibe to avoid a state where references are silently ignored
      // while stuck in a mode that can't be selected.
      if (
        next.referenceMode === "reference" &&
        !supportsReferences(next.model)
      ) {
        next.referenceMode = "vibe";
      }
      return next;
    });
  }, []);

  const slots = viewedBatch ? toSlots(viewedBatch) : engine.slots;
  const shownImages = useMemo(
    () =>
      slots
        .map((slot) => slot.image)
        .filter((image): image is GeneratedImage => image !== null),
    [slots]
  );

  /**
   * Batch mode runs the picked scenes; normal mode runs the prompt box.
   *
   * The scenes are resolved here, at the moment generate is pressed, so a
   * collection edited mid-run cannot change what is already queued.
   */
  async function buildJobs(): Promise<GenerationJob[]> {
    if (mode !== "batch") return [{ label: "", form }];

    const situations = templateSelection.situationIds.flatMap((id) => {
      const found = situationList.find((item) => item.id === id);
      return found ? [found] : [];
    });
    const picked: SelectedCharacter[] = templateSelection.characters.flatMap(
      ({ id, position }) => {
        const character = characterList.find((item) => item.id === id);
        return character ? [{ character, position }] : [];
      }
    );
    const style =
      styleList.find((item) => item.id === templateSelection.styleId) ?? null;

    if (situations.length === 0) {
      toast.error(t("generate.template.noSituation"));
      return [];
    }

    const overrides = styleParamOverrides(style);
    const base: FormState = {
      ...form,
      ...overrides,
      ...COMPOSED_PROMPT_FLAGS,
      ...(await applyStyleImages(style, overrides.model ?? form.model)),
    };

    const jobs = composeTemplateJobs(base, {
      situations,
      characters: picked,
      style,
    });
    if (jobs.length === 0) {
      toast.error(t("generate.template.allEmpty"));
      return [];
    }
    if (jobs.length < situations.length) {
      toast.warning(
        t("generate.template.someEmpty", {
          count: situations.length - jobs.length,
        })
      );
    }
    return jobs;
  }

  /** Reference images a style carries, loaded once for the whole run. */
  async function applyStyleImages(style: Style | null, model: string) {
    if (!style) return {};
    const loaded = await loadStyleReferenceImages(style);
    const dropped = loaded.droppedVibes + loaded.droppedReferences;
    if (dropped > 0) {
      toast.warning(t("generate.template.imagesDropped", { count: dropped }));
    }
    const canUseReferences =
      loaded.references.length > 0 && supportsReferences(model);
    // A style holding both kinds cannot send both, so the panel's current mode
    // decides. With only one kind, that kind wins.
    const preferReferences =
      canUseReferences &&
      (loaded.vibes.length === 0 || form.referenceMode === "reference");
    if (preferReferences) {
      return {
        referenceMode: "reference" as const,
        references: loaded.references,
        vibes: [],
      };
    }
    // A model with no vibe support (V5) leaves the style's vibes unused, the
    // same way its references go unused on a pre-V4.5 model.
    if (loaded.vibes.length > 0 && supportsVibes(model)) {
      return {
        referenceMode: "vibe" as const,
        vibes: loaded.vibes,
        references: [],
      };
    }
    return {};
  }

  /**
   * What this exact run spends on reference images.
   *
   * Judged on the jobs, not the panel: in batch mode a style's vibes only
   * join the form while the jobs are being built, and judging the panel let
   * them slip past the confirmation entirely. The uncached count comes from
   * the server's encode cache, so a vibe that has been paid for once — from
   * any source — is not counted again.
   */
  async function assessJobs(jobs: GenerationJob[]): Promise<ReferenceCost> {
    const jobForm = jobs[0]?.form ?? form;
    const picked = pickedLibraryReferences(jobForm, libraryReferences);
    const imageCount = jobs.reduce((sum, job) => sum + job.form.nSamples, 0);

    // Library vibes keep their own per-entry cache; encodedAt says which side
    // of it they are on without a round trip.
    const uncachedLibrary = picked.filter(
      (entry) => entry.encodedAt === null
    ).length;

    let uncachedDirect = 0;
    if (jobForm.referenceMode === "vibe" && jobForm.vibes.length > 0) {
      const items = await Promise.all(
        jobForm.vibes.map(async (vibe) => ({
          sha256: await hashVibeImage(vibe.imageBase64),
          infoExtracted: vibe.infoExtracted,
          model: jobForm.model,
        }))
      );
      const cached = await fetchVibeCacheStatus(items);
      uncachedDirect = cached.filter((hit) => !hit).length;
    }

    return assessReferenceSpend({
      model: jobForm.model,
      referenceMode: jobForm.referenceMode,
      vibeCount: jobForm.vibes.length + picked.length,
      uncachedVibeCount: uncachedDirect + uncachedLibrary,
      preciseCount: jobForm.references.length + picked.length,
      imageCount,
    });
  }

  async function handleGenerate() {
    setViewedBatch(null);
    setSelectedIds([]);
    const jobs = await buildJobs();
    if (jobs.length === 0) return;
    // Reference images are the part that is spent on top and cannot be taken
    // back, so a run that pays for them stops here first. A run that spends
    // nothing — everything cached, or nothing sent — goes straight through.
    const cost = await assessJobs(jobs);
    if (cost.total > 0) {
      setPendingCost(cost);
      setPendingJobs(jobs);
      return;
    }
    await engine.generate(jobs);
  }

  const canGenerate =
    mode === "batch"
      ? templateSelection.situationIds.length > 0
      : form.prompt.trim().length > 0;

  // Generate with Ctrl / Cmd + Enter. A bare Enter while typing the prompt is
  // used by tag completion, so leave it alone.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Enter" || !(event.metaKey || event.ctrlKey)) return;
      if (engine.isGenerating || !canGenerate) return;
      event.preventDefault();
      void handleGenerate();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  function handleDelete(image: GeneratedImage) {
    // Work out where the lightbox should land before the image leaves the list,
    // so deleting walks to a neighbour instead of dropping the viewer.
    const index = shownImages.findIndex((item) => item.id === image.id);
    const neighbour = shownImages[index + 1] ?? shownImages[index - 1] ?? null;

    library.deleteImage(image.id);
    setViewedBatch((current) =>
      current ? current.filter((item) => item.id !== image.id) : current
    );
    engine.removeImage(image.id);
    setSelectedIds((current) => current.filter((id) => id !== image.id));
    setLightboxId((current) =>
      current === image.id ? (neighbour?.id ?? null) : current
    );
  }

  function handleGridSelect(imageId: string, event: React.MouseEvent) {
    // Only a modifier-click does multi-select. A plain click selects one image.
    if (event.metaKey || event.ctrlKey || event.shiftKey) {
      setSelectedIds((current) =>
        current.includes(imageId)
          ? current.filter((id) => id !== imageId)
          : [...current, imageId]
      );
      return;
    }
    setSelectedIds((current) =>
      current.length === 1 && current[0] === imageId ? [] : [imageId]
    );
  }

  async function copyWithToast(text: string, successKey: MessageKey) {
    if (await copyToClipboard(text)) toast.success(t(successKey));
    else toast.error(t("error.clipboard"));
  }

  const imageActions = {
    onDownload: downloadImage,
    onCopyPrompt: (image: GeneratedImage) =>
      void copyWithToast(image.prompt, "image.copiedPrompt"),
    onCopySeed: (image: GeneratedImage) =>
      void copyWithToast(String(image.seed), "image.copiedSeed"),
    onDelete: handleDelete,
  };

  return (
    // The header spans the full width above both columns, so the panel and the
    // viewer start at the same y and the panel toggle never moves.
    <div className="grid h-svh grid-rows-[auto_minmax(0,1fr)] overflow-hidden">
      <WorkspaceHeader
        panelOpen={panelOpen}
        onTogglePanel={togglePanel}
        canGenerate={canGenerate}
        isGenerating={engine.isGenerating}
        anlasText={anlasText}
        onGenerate={() => void handleGenerate()}
        onCancel={engine.cancel}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        tileSize={tileSize}
        onTileSizeChange={setTileSize}
        onOpenLibrary={() => setLibraryOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      <div
        className={cn(
          "grid min-h-0 overflow-hidden",
          panelOpen
            ? // 340px at the default root size, in rem so it grows with the rest
              // of the UI on a large screen.
              "grid-cols-[21.25rem_minmax(0,1fr)]"
            : "grid-cols-[minmax(0,1fr)]"
        )}
      >
        {panelOpen && (
          <aside className="bg-card min-h-0 border-r">
            <GeneratePanel
              form={form}
              update={update}
              mode={mode}
              onModeChange={changeMode}
              templateSelection={templateSelection}
              onTemplateSelectionChange={setTemplateSelection}
              isGenerating={engine.isGenerating}
              canGenerate={canGenerate}
              anlasText={anlasText}
              onGenerate={() => void handleGenerate()}
              onCancel={engine.cancel}
            />
          </aside>
        )}

        <section className="flex min-h-0 min-w-0 flex-col">
          {/* The surface under generated images stays neutral so the artwork reads true. */}
          <div className="bg-canvas flex min-h-0 flex-1 flex-col">
            {slots.length === 0 ? (
              <div className="text-muted-foreground flex flex-1 flex-col items-center justify-center gap-3">
                <ImageIcon className="size-10 opacity-40" aria-hidden />
                <p className="text-sm">
                  {t(mode === "batch" ? "viewer.emptyBatch" : "viewer.empty")}
                </p>
              </div>
            ) : viewMode === "single" ? (
              <SingleImageView
                // Reset the carousel position when the batch changes.
                key={viewedBatch?.[0]?.batchId ?? "current"}
                slots={slots}
                resolveSrc={resolveImageSrc}
                resolveThumb={resolveThumbSrc}
                onOpenLightbox={setLightboxId}
                {...imageActions}
              />
            ) : (
              <div className="min-h-0 flex-1 overflow-y-auto p-3">
                <ImageGrid
                  slots={slots}
                  resolveSrc={resolveThumbSrc}
                  tileSize={tileSize}
                  selectedIds={selectedIds}
                  onSelect={handleGridSelect}
                  onOpen={setLightboxId}
                />
              </div>
            )}

            <HistoryFooter
              historyStrip={library.images}
              resolveSrc={resolveThumbSrc}
              onSelectBatch={(images) => {
                setViewedBatch(images);
                setSelectedIds([]);
              }}
              onClearHistory={() => {
                library.clearImages();
                // The viewer and the lightbox may still hold images that no
                // longer exist on disk, so clear them too.
                setViewedBatch(null);
                engine.reset();
                setLightboxId(null);
                setSelectedIds([]);
              }}
              isGenerating={engine.isGenerating}
              generatingProgress={
                engine.isGenerating
                  ? { done: engine.done, total: engine.total }
                  : null
              }
            />
          </div>
        </section>
      </div>

      {lightboxId && shownImages.some((image) => image.id === lightboxId) && (
        <ImageLightbox
          images={shownImages}
          currentId={lightboxId}
          resolveSrc={resolveImageSrc}
          onClose={() => setLightboxId(null)}
          onNavigate={setLightboxId}
          {...imageActions}
        />
      )}

      <LibraryDialog
        open={libraryOpen}
        onOpenChange={setLibraryOpen}
        images={library.images}
        resolveSrc={resolveThumbSrc}
        onOpenBatch={(images) => {
          setViewedBatch(images);
          setSelectedIds([]);
        }}
      />

      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />

      <AnlasConfirmDialog
        open={pendingJobs !== null}
        cost={pendingCost}
        onCancel={() => {
          setPendingJobs(null);
          setPendingCost(null);
        }}
        onConfirm={() => {
          const jobs = pendingJobs;
          setPendingJobs(null);
          setPendingCost(null);
          if (jobs) void engine.generate(jobs);
        }}
      />
    </div>
  );
}
