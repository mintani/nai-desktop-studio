"use client";

import { Button } from "@nai-desktop-studio/ui/components/button";
import { DialogTitle } from "@nai-desktop-studio/ui/components/dialog";
import { Input } from "@nai-desktop-studio/ui/components/input";
import { Label } from "@nai-desktop-studio/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@nai-desktop-studio/ui/components/select";
import { ArrowLeft, ImagePlus, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { collectGroupNames, GroupField } from "@/components/group-field";
import { TagAutocompleteTextarea } from "@/components/tag-autocomplete/tag-autocomplete-textarea";
import {
  deleteAssetsByPath,
  uploadAsset,
} from "@/features/library/collections";
import { useT } from "@/i18n/provider";
import type { MessageKey } from "@/i18n/messages";

import { collectStyleAssetPaths, useStyles } from "../hooks/queries";
import {
  createEmptyStyle,
  STYLE_PROMPT_POSITION_LABEL_KEYS,
  STYLE_PROMPT_POSITIONS,
  type Style,
  type StyleGenerationParams,
  type StylePromptPosition,
  type StyleReference,
  type StyleVibe,
} from "../types/style";
import {
  AddImageButton,
  imageSrc,
  readPendingImage,
  revokeDraftImage,
  type DraftImage,
  type DraftReference,
  type DraftVibe,
} from "./style-image-picker";
import { StyleParamOverrides } from "./style-param-overrides";
import { StyleReferenceManager } from "./style-reference-manager";
import { StyleVibeManager } from "./style-vibe-manager";

/** Working copy of a style: images are drafts until save resolves them. */
type DraftStyle = {
  id: string;
  name: string;
  groupName: string;
  styleTag: string;
  negativeTag: string;
  promptPosition: StylePromptPosition;
  negativePosition: StylePromptPosition;
  sample: DraftImage | null;
  vibes: DraftVibe[];
  references: DraftReference[];
  params: StyleGenerationParams;
  createdAt: string;
};

function draftFromStyle(style: Style): DraftStyle {
  return {
    id: style.id,
    name: style.name,
    groupName: style.groupName ?? "",
    styleTag: style.styleTag,
    negativeTag: style.negativeTag,
    promptPosition: style.promptPosition,
    negativePosition: style.negativePosition,
    sample: style.samplePath
      ? { source: "stored", imagePath: style.samplePath }
      : null,
    vibes: style.vibes.map((vibe) => ({
      id: vibe.id,
      image: { source: "stored", imagePath: vibe.imagePath },
      strength: vibe.strength,
      infoExtracted: vibe.infoExtracted,
    })),
    references: style.references.map((reference) => ({
      id: reference.id,
      image: { source: "stored", imagePath: reference.imagePath },
      referenceType: reference.referenceType,
      strength: reference.strength,
      fidelity: reference.fidelity,
    })),
    params: {
      model: style.model,
      steps: style.steps,
      scale: style.scale,
      cfgRescale: style.cfgRescale,
      varietyBoost: style.varietyBoost,
      sampler: style.sampler,
      noiseSchedule: style.noiseSchedule,
    },
    createdAt: style.createdAt,
  };
}

function isStylePromptPosition(value: unknown): value is StylePromptPosition {
  return (
    typeof value === "string" &&
    (STYLE_PROMPT_POSITIONS as readonly string[]).includes(value)
  );
}

function PositionSelect({
  id,
  value,
  onChange,
}: {
  id: string;
  value: StylePromptPosition;
  onChange: (value: StylePromptPosition) => void;
}) {
  const t = useT();
  return (
    <Select
      value={value}
      items={STYLE_PROMPT_POSITIONS.map((position) => ({
        value: position,
        label: t(STYLE_PROMPT_POSITION_LABEL_KEYS[position] as MessageKey),
      }))}
      onValueChange={(next) => {
        if (isStylePromptPosition(next)) onChange(next);
      }}
    >
      <SelectTrigger id={id} className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {STYLE_PROMPT_POSITIONS.map((position) => (
          <SelectItem key={position} value={position}>
            {t(STYLE_PROMPT_POSITION_LABEL_KEYS[position] as MessageKey)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

type Props = {
  /** null starts a fresh style; otherwise the style being edited. */
  style: Style | null;
  onClose: () => void;
};

export function StyleEditor({ style, onClose }: Props) {
  const t = useT();
  const { styles, save } = useStyles();
  const groupOptions = useMemo(() => collectGroupNames(styles), [styles]);

  const [draft, setDraft] = useState<DraftStyle>(() =>
    draftFromStyle(style ?? createEmptyStyle(""))
  );
  const [nameError, setNameError] = useState(false);
  const [saving, setSaving] = useState(false);

  const isEdit = style !== null;
  const originalAssetPaths = useRef(style ? collectStyleAssetPaths(style) : []);

  // Free every pending object URL when the editor unmounts, however it closed.
  const draftRef = useRef(draft);
  draftRef.current = draft;
  useEffect(
    () => () => {
      const current = draftRef.current;
      if (current.sample) revokeDraftImage(current.sample);
      current.vibes.forEach((vibe) => revokeDraftImage(vibe.image));
      current.references.forEach((reference) =>
        revokeDraftImage(reference.image)
      );
    },
    []
  );

  const patch = (next: Partial<DraftStyle>) =>
    setDraft((current) => ({ ...current, ...next }));

  async function handlePickSample(file: File) {
    const read = await readPendingImage(file);
    if (!read.ok) {
      toast.error(
        read.reason === "not-image"
          ? t("styles.image.notImage")
          : t("styles.image.tooLarge")
      );
      return;
    }
    if (draft.sample) revokeDraftImage(draft.sample);
    patch({ sample: read.image });
  }

  function removeSample() {
    if (draft.sample) revokeDraftImage(draft.sample);
    patch({ sample: null });
  }

  async function handleSave() {
    const name = draft.name.trim();
    if (!name) {
      setNameError(true);
      return;
    }
    setSaving(true);

    const uploadedPaths: string[] = [];
    const resolve = async (image: DraftImage): Promise<string> => {
      if (image.source === "stored") return image.imagePath;
      const uploaded = await uploadAsset(image.imageBase64, image.contentType);
      uploadedPaths.push(uploaded.path);
      return uploaded.path;
    };

    try {
      const samplePath = draft.sample ? await resolve(draft.sample) : null;
      const vibes: StyleVibe[] = [];
      for (const [index, vibe] of draft.vibes.entries()) {
        vibes.push({
          id: vibe.id,
          imagePath: await resolve(vibe.image),
          strength: vibe.strength,
          infoExtracted: vibe.infoExtracted,
          sortOrder: index,
        });
      }
      const references: StyleReference[] = [];
      for (const [index, reference] of draft.references.entries()) {
        references.push({
          id: reference.id,
          imagePath: await resolve(reference.image),
          referenceType: reference.referenceType,
          strength: reference.strength,
          fidelity: reference.fidelity,
          sortOrder: index,
        });
      }

      const next: Style = {
        id: draft.id,
        name,
        groupName: draft.groupName.trim() || null,
        samplePath,
        styleTag: draft.styleTag,
        negativeTag: draft.negativeTag,
        promptPosition: draft.promptPosition,
        negativePosition: draft.negativePosition,
        vibes,
        references,
        ...draft.params,
        createdAt: draft.createdAt,
        updatedAt: new Date().toISOString(),
      };

      await save.mutateAsync(next);

      // Delete assets the saved style no longer references (best-effort).
      const keep = new Set(collectStyleAssetPaths(next));
      const removed = originalAssetPaths.current.filter(
        (path) => !keep.has(path)
      );
      if (removed.length > 0) void deleteAssetsByPath(removed);

      onClose();
    } catch {
      // A failed save must not strand the images it just uploaded.
      if (uploadedPaths.length > 0) void deleteAssetsByPath(uploadedPaths);
      toast.error(t("styles.toast.saveFailed"));
      setSaving(false);
    }
  }

  return (
    <div className="flex max-h-[80vh] flex-col gap-3">
      <div className="flex items-center gap-2 pr-8">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onClose}
          title={t("styles.editor.back")}
        >
          <ArrowLeft />
          <span className="sr-only">{t("styles.editor.back")}</span>
        </Button>
        <DialogTitle>
          {isEdit ? t("styles.editor.edit") : t("styles.editor.new")}
        </DialogTitle>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-1">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="style-name">{t("styles.field.name")}</Label>
            <Input
              id="style-name"
              value={draft.name}
              placeholder={t("styles.field.namePlaceholder")}
              aria-invalid={nameError}
              onChange={(event) => {
                setNameError(false);
                patch({ name: event.target.value });
              }}
            />
            {nameError && (
              <p className="text-destructive text-xs">
                {t("styles.error.nameRequired")}
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="style-group">{t("group.label")}</Label>
            <GroupField
              id="style-group"
              value={draft.groupName || null}
              options={groupOptions}
              onChange={(groupName) => patch({ groupName: groupName ?? "" })}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>{t("styles.field.sample")}</Label>
          <div className="flex items-start gap-3">
            <div className="bg-muted relative size-20 shrink-0 overflow-hidden rounded-sm border">
              {draft.sample ? (
                <img
                  src={imageSrc(draft.sample)}
                  alt=""
                  className="size-full object-cover"
                  decoding="async"
                />
              ) : (
                <span className="text-muted-foreground flex size-full items-center justify-center">
                  <ImagePlus className="size-6" aria-hidden />
                </span>
              )}
            </div>
            <div className="flex-1 space-y-2">
              <AddImageButton
                label={
                  draft.sample
                    ? t("styles.sample.change")
                    : t("styles.sample.pick")
                }
                onPick={handlePickSample}
              />
              {draft.sample && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={removeSample}
                >
                  <X />
                  {t("styles.action.delete")}
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="style-tag">{t("styles.field.styleTag")}</Label>
          <TagAutocompleteTextarea
            id="style-tag"
            value={draft.styleTag}
            onChange={(value) => patch({ styleTag: value })}
            rows={2}
            placeholder={t("styles.field.styleTagPlaceholder")}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="style-position">
            {t("styles.field.promptPosition")}
          </Label>
          <PositionSelect
            id="style-position"
            value={draft.promptPosition}
            onChange={(value) => patch({ promptPosition: value })}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="negative-tag">{t("styles.field.negativeTag")}</Label>
          <TagAutocompleteTextarea
            id="negative-tag"
            value={draft.negativeTag}
            onChange={(value) => patch({ negativeTag: value })}
            rows={2}
            placeholder={t("styles.field.negativeTagPlaceholder")}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="negative-position">
            {t("styles.field.negativePosition")}
          </Label>
          <PositionSelect
            id="negative-position"
            value={draft.negativePosition}
            onChange={(value) => patch({ negativePosition: value })}
          />
        </div>

        <StyleParamOverrides
          params={draft.params}
          onChange={(params) =>
            patch({ params: { ...draft.params, ...params } })
          }
        />

        <StyleVibeManager
          vibes={draft.vibes}
          onChange={(vibes) => patch({ vibes })}
          blocked={draft.references.length > 0}
        />

        <StyleReferenceManager
          references={draft.references}
          onChange={(references) => patch({ references })}
          blocked={draft.vibes.length > 0}
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose}>
          {t("styles.editor.back")}
        </Button>
        <Button type="button" onClick={handleSave} disabled={saving}>
          {saving ? t("styles.editor.saving") : t("styles.editor.save")}
        </Button>
      </div>
    </div>
  );
}
