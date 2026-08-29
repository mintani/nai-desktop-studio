"use client";

import { Button } from "@nai-desktop-studio/ui/components/button";
import { Input } from "@nai-desktop-studio/ui/components/input";
import { Label } from "@nai-desktop-studio/ui/components/label";
import { cn } from "@nai-desktop-studio/ui/lib/utils";

import { Coins, Zap } from "lucide-react";

import { GroupField } from "@/components/group-field";
import { LabeledSlider } from "@/components/labeled-slider";
import { REFERENCE_TYPES } from "@/features/generate/types/reference";
import type { ReferenceType } from "@/features/generate/types/reference";
import { useT } from "@/i18n/provider";

import type { ReferenceEntry } from "../types/reference";

/**
 * What using this entry costs. An unencoded vibe is the one thing here that
 * will spend Anlas, so it alone gets the accent colour.
 */
export function ReferenceEntryStatus({ entry }: { entry: ReferenceEntry }) {
  const t = useT();

  return (
    <span
      className={cn(
        "flex items-center gap-1 font-mono text-[10px]",
        entry.kind === "vibe" && !entry.encodedAt
          ? "text-primary"
          : "text-muted-foreground"
      )}
    >
      {entry.kind === "vibe" &&
        (entry.encodedAt ? (
          <Zap className="size-2.5" aria-hidden />
        ) : (
          <Coins className="size-2.5" aria-hidden />
        ))}
      {entry.kind === "reference"
        ? t("referenceLibrary.preciseCost")
        : entry.encodedAt
          ? t("referenceLibrary.encoded")
          : t("referenceLibrary.notEncoded")}
    </span>
  );
}

type Props = {
  entry: ReferenceEntry;
  /** Group names the library already uses. */
  groupOptions: readonly string[];
  onPatch: (patch: Partial<ReferenceEntry>) => void;
};

/**
 * The editable settings of one saved entry: name, group and the controls its
 * kind uses. Shared by the picker's side panel and the store dialog, so the
 * two places cannot drift apart.
 */
export function ReferenceEntryFields({ entry, groupOptions, onPatch }: Props) {
  const t = useT();

  return (
    <>
      <div className="space-y-1">
        <Label htmlFor={`reference-name-${entry.id}`}>
          {t("referenceLibrary.name")}
        </Label>
        <Input
          id={`reference-name-${entry.id}`}
          value={entry.name}
          onChange={(event) => onPatch({ name: event.target.value })}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor={`reference-group-${entry.id}`}>
          {t("group.label")}
        </Label>
        <GroupField
          id={`reference-group-${entry.id}`}
          value={entry.groupName}
          options={groupOptions}
          onChange={(groupName) => onPatch({ groupName })}
        />
      </div>

      <LabeledSlider
        label={t("reference.strength")}
        value={entry.strength}
        min={0.01}
        max={1}
        step={0.01}
        onChange={(strength) => onPatch({ strength })}
      />

      {entry.kind === "vibe" ? (
        <div className="space-y-1.5">
          <LabeledSlider
            label={t("reference.infoExtracted")}
            value={entry.infoExtracted}
            min={0.01}
            max={1}
            step={0.01}
            onChange={(infoExtracted) => onPatch({ infoExtracted })}
          />
          <p className="text-muted-foreground/80 text-[10px] leading-relaxed">
            {t("referenceLibrary.infoExtractedHint")}
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-1">
            <Label>{t("reference.mode.precise")}</Label>
            <div className="flex flex-wrap gap-1">
              {REFERENCE_TYPES.map((type: ReferenceType) => (
                <Button
                  key={type}
                  type="button"
                  size="xs"
                  variant={
                    entry.referenceType === type ? "secondary" : "outline"
                  }
                  className={cn(
                    entry.referenceType === type && "border-primary"
                  )}
                  onClick={() => onPatch({ referenceType: type })}
                >
                  {t(
                    type === "character"
                      ? "reference.type.character"
                      : type === "style"
                        ? "reference.type.style"
                        : "reference.type.characterStyle"
                  )}
                </Button>
              ))}
            </div>
          </div>
          <LabeledSlider
            label={t("reference.fidelity")}
            value={entry.fidelity}
            min={0}
            max={1}
            step={0.01}
            onChange={(fidelity) => onPatch({ fidelity })}
          />
        </>
      )}
    </>
  );
}
