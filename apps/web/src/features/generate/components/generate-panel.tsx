"use client";

import { Button } from "@nai-desktop-studio/ui/components/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@nai-desktop-studio/ui/components/collapsible";
import { ScrollArea } from "@nai-desktop-studio/ui/components/scroll-area";
import { Separator } from "@nai-desktop-studio/ui/components/separator";
import { cn } from "@nai-desktop-studio/ui/lib/utils";
import { ChevronDown, Loader2, Square, WandSparkles } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { SegmentedControl } from "@/components/segmented-control";
import { useSettings } from "@/features/settings/hooks/queries";
import { useT } from "@/i18n/provider";

import { aspectOfSize } from "../constants";
import type { PanelSectionId } from "../constants";
import { supportsCharacters as modelSupportsCharacters } from "../lib/build-request";
import { supportsFreePlacement } from "../lib/placement";
import type { FormState, GenerationMode } from "../types/generate";
import type { TemplateSelection } from "../types/template";
import { CharactersSection } from "./characters-section";
import {
  AdvancedSettings,
  CountField,
  ModelField,
  SizeField,
} from "./generation-settings";
import { PromptSection } from "./prompt-section";
import { ReferenceSettings } from "./reference-settings";
import { TemplateSection } from "./template-section";

/**
 * The trigger keeps its position when the section opens — the body grows
 * downward from it — so a second click never lands on something else.
 */
function Section({
  title,
  badge,
  defaultOpen = false,
  children,
}: {
  title: string;
  badge?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  // The setting arrives a moment after the first paint, and can change while
  // the panel is on screen. Follow it both times. A section opened by hand
  // stays open, because only a change to the setting runs this again.
  useEffect(() => {
    setOpen(defaultOpen);
  }, [defaultOpen]);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="font-display flex w-full items-center justify-between py-2 text-left">
        <span className="flex items-center gap-2 text-xs font-medium">
          {title}
          {badge && (
            <span className="bg-muted text-muted-foreground rounded-pill px-1.5 py-0.5 font-mono text-[10px] tabular-nums">
              {badge}
            </span>
          )}
        </span>
        <ChevronDown
          className={cn(
            "text-muted-foreground size-4 transition-transform duration-150 ease-out",
            open && "rotate-180"
          )}
          aria-hidden
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-1 pb-3">{children}</CollapsibleContent>
    </Collapsible>
  );
}

type Props = {
  form: FormState;
  update: (patch: Partial<FormState>) => void;
  mode: GenerationMode;
  onModeChange: (mode: GenerationMode) => void;
  templateSelection: TemplateSelection;
  onTemplateSelectionChange: (selection: TemplateSelection) => void;
  isGenerating: boolean;
  /** Whether the current mode has enough picked to run. */
  canGenerate: boolean;
  /** Estimated extra Anlas. null while it is being fetched. */
  anlasText: string | null;
  onGenerate: () => void;
  onCancel: () => void;
};

/**
 * The generation form. What changes on most runs stays visible; what rarely
 * changes folds away. The button sits on the panel's bottom edge — the scroll
 * area above it takes the remaining height — so opening or closing a section
 * never moves it.
 */
export function GeneratePanel({
  form,
  update,
  mode,
  onModeChange,
  templateSelection,
  onTemplateSelectionChange,
  isGenerating,
  canGenerate,
  anlasText,
  onGenerate,
  onCancel,
}: Props) {
  const t = useT();
  const referenceCount =
    (form.i2i ? 1 : 0) +
    (form.referenceMode === "vibe"
      ? form.vibes.length
      : form.references.length);
  const supportsCharacters = modelSupportsCharacters(form.model);
  const { data: settings } = useSettings();
  const openSections = settings?.openSections;
  const startsOpen = useCallback(
    (id: PanelSectionId) => openSections?.includes(id) ?? false,
    [openSections]
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Pinned above the fields: the mode decides which of them are shown, and
       * it is state the panel should never scroll out of sight. */}
      <div className="shrink-0 border-b px-3 py-2">
        <SegmentedControl
          label={t("generate.mode.label")}
          value={mode}
          options={[
            { value: "normal", label: t("generate.mode.normal") },
            { value: "batch", label: t("generate.mode.batch") },
          ]}
          onChange={onModeChange}
        />
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-3 px-3 py-3">
          <ModelField form={form} update={update} />

          {/* In batch mode the scenes are the prompt: the picked situations
              compose one per image at generate time, so the prompt box and the
              hand-written character list would be two more sources of truth
              for the same thing. */}
          {mode === "batch" ? (
            <Section
              title={t("generate.section.template")}
              defaultOpen={startsOpen("template")}
            >
              <TemplateSection
                selection={templateSelection}
                onSelectionChange={onTemplateSelectionChange}
                perScene={form.nSamples}
                aspect={aspectOfSize(form.size)}
                freeform={supportsFreePlacement(form.model)}
              />
            </Section>
          ) : (
            <PromptSection form={form} update={update} />
          )}

          <SizeField form={form} update={update} />
          <CountField form={form} update={update} />

          <Separator className="my-1" />

          {mode === "normal" && supportsCharacters && (
            <Section
              title={t("generate.section.characters")}
              defaultOpen={startsOpen("characters")}
              badge={
                form.characters.length > 0
                  ? String(form.characters.length)
                  : undefined
              }
            >
              <CharactersSection
                characters={form.characters}
                update={update}
                aspect={aspectOfSize(form.size)}
                freeform={supportsFreePlacement(form.model)}
              />
            </Section>
          )}

          <Section
            title={t("generate.section.reference")}
            defaultOpen={startsOpen("reference")}
            badge={referenceCount > 0 ? String(referenceCount) : undefined}
          >
            <ReferenceSettings form={form} update={update} />
          </Section>

          <Section
            title={t("generate.section.advanced")}
            defaultOpen={startsOpen("advanced")}
          >
            <AdvancedSettings form={form} update={update} />
          </Section>
        </div>
      </ScrollArea>

      <div className="shrink-0 border-t px-3 py-3">
        {isGenerating ? (
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="w-full"
            onClick={onCancel}
          >
            <Square className="mr-1.5 size-4 fill-current" />
            {t("generate.stop")}
          </Button>
        ) : (
          <Button
            type="button"
            size="lg"
            className="w-full justify-between"
            disabled={!canGenerate}
            onClick={onGenerate}
          >
            <span className="flex items-center gap-1.5">
              <WandSparkles className="size-4" />
              {t("generate.run")}
            </span>
            <span className="font-mono text-[10px] font-semibold tabular-nums opacity-80">
              {anlasText ?? <Loader2 className="size-3 animate-spin" />}
            </span>
          </Button>
        )}
      </div>
    </div>
  );
}
