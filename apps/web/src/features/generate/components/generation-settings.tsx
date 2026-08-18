"use client";

import { Button } from "@nai-desktop-studio/ui/components/button";
import { Input } from "@nai-desktop-studio/ui/components/input";
import { Label } from "@nai-desktop-studio/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@nai-desktop-studio/ui/components/select";
import { Switch } from "@nai-desktop-studio/ui/components/switch";
import { cn } from "@nai-desktop-studio/ui/lib/utils";
import { Dices } from "lucide-react";

import { LabeledSlider } from "@/components/labeled-slider";
import { useT } from "@/i18n/provider";
import type { MessageKey } from "@/i18n/messages";

import {
  MODEL_OPTIONS,
  NOISE_SCHEDULE_OPTIONS,
  N_SAMPLES_OPTIONS,
  PRIMARY_SIZES,
  SAMPLER_OPTIONS,
  SIZE_OPTIONS,
  UC_PRESET_OPTIONS,
} from "../constants";
import type {
  FormState,
  NoiseSchedule,
  Sampler,
  SizePreset,
} from "../types/generate";

type Props = {
  form: FormState;
  update: (patch: Partial<FormState>) => void;
};

/** Aspect-ratio preview shown inside each resolution button. */
function SizePreview({ width, height }: { width: number; height: number }) {
  const max = 20;
  const scale = max / Math.max(width, height);
  return (
    <span
      className="border-current/40 block rounded-[2px] border"
      style={{ width: width * scale, height: height * scale }}
      aria-hidden
    />
  );
}

function formatSamplerLabel(sampler: string) {
  return sampler
    .replace(/^k_/, "")
    .replace(/^ddim_/, "ddim ")
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

const isPrimarySize = (size: SizePreset) =>
  PRIMARY_SIZES.some((value) => value === size);

/** Kept out of the collapsible sections: the model changes what else is valid. */
export function ModelField({ form, update }: Props) {
  const t = useT();

  return (
    <div className="space-y-1.5">
      <Label htmlFor="model">{t("generate.model")}</Label>
      <Select
        value={form.model}
        // base-ui's SelectValue shows the raw value unless items is passed, so
        // always pass the mapping.
        items={MODEL_OPTIONS.map((option) => ({
          value: option.value,
          label: option.label,
        }))}
        onValueChange={(value) => {
          if (typeof value !== "string") return;
          const model = MODEL_OPTIONS.find((option) => option.value === value);
          if (model) update({ model: model.value });
        }}
      >
        <SelectTrigger id="model" className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {MODEL_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

/**
 * Portrait and landscape cover almost every run, so they get their own buttons.
 * The rest sit behind "Other" and only appear as a select once it is chosen.
 */
export function SizeField({ form, update }: Props) {
  const t = useT();
  const otherSizes = SIZE_OPTIONS.filter(
    (option) => !isPrimarySize(option.value)
  );
  const usingOther = !isPrimarySize(form.size);
  const current =
    SIZE_OPTIONS.find((option) => option.value === form.size) ??
    SIZE_OPTIONS[0];

  return (
    <div className="space-y-1.5">
      <Label>{t("generate.resolution")}</Label>
      <div className="grid grid-cols-3 gap-1.5">
        {SIZE_OPTIONS.filter((option) => isPrimarySize(option.value)).map(
          (option) => (
            <Button
              key={option.value}
              type="button"
              variant={form.size === option.value ? "secondary" : "outline"}
              className={cn(
                "h-auto flex-col items-center gap-1 rounded-md! px-1 py-2",
                form.size === option.value && "border-primary"
              )}
              onClick={() => update({ size: option.value })}
            >
              <SizePreview width={option.w} height={option.h} />
              <span className="text-[10px] font-medium">
                {t(option.labelKey as MessageKey)}
              </span>
            </Button>
          )
        )}
        <Button
          type="button"
          variant={usingOther ? "secondary" : "outline"}
          className={cn(
            "h-auto flex-col items-center gap-1 rounded-md! px-1 py-2",
            usingOther && "border-primary"
          )}
          onClick={() => {
            if (!usingOther && otherSizes[0]) {
              update({ size: otherSizes[0].value });
            }
          }}
        >
          <SizePreview
            width={usingOther ? current.w : 1024}
            height={usingOther ? current.h : 1024}
          />
          <span className="text-[10px] font-medium">
            {t("generate.size.other")}
          </span>
        </Button>
      </div>

      {usingOther && (
        <Select
          value={form.size}
          items={otherSizes.map((option) => ({
            value: option.value,
            label: `${t(option.labelKey as MessageKey)} · ${option.w} × ${option.h}`,
          }))}
          onValueChange={(value) => {
            const size = otherSizes.find((option) => option.value === value);
            if (size) update({ size: size.value });
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {otherSizes.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {t(option.labelKey as MessageKey)} · {option.w} × {option.h}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <p className="text-muted-foreground font-mono text-[10px] tabular-nums">
        {current.w} × {current.h}
      </p>
    </div>
  );
}

export function CountField({ form, update }: Props) {
  const t = useT();

  return (
    <div className="space-y-1.5">
      <Label>{t("generate.count")}</Label>
      <div className="grid grid-cols-8 gap-1">
        {N_SAMPLES_OPTIONS.map((count) => (
          <Button
            key={count}
            type="button"
            size="sm"
            variant={form.nSamples === count ? "secondary" : "outline"}
            className={cn(
              "px-0 font-mono tabular-nums",
              form.nSamples === count && "border-primary"
            )}
            onClick={() => update({ nSamples: count })}
          >
            {count}
          </Button>
        ))}
      </div>
    </div>
  );
}

/** Steps, seed and the sampler rarely change run to run, so they stay folded. */
export function AdvancedSettings({ form, update }: Props) {
  const t = useT();

  return (
    <div className="space-y-4">
      <LabeledSlider
        label={t("generate.steps")}
        value={form.steps}
        min={1}
        max={50}
        step={1}
        onChange={(steps) => update({ steps })}
      />
      <LabeledSlider
        label={t("generate.scale")}
        value={form.scale}
        min={0}
        max={10}
        step={0.1}
        onChange={(scale) => update({ scale })}
        format={(value) => value.toFixed(1)}
      />
      <LabeledSlider
        label={t("generate.cfgRescale")}
        value={form.cfgRescale}
        min={0}
        max={1}
        step={0.01}
        onChange={(cfgRescale) => update({ cfgRescale })}
        format={(value) => value.toFixed(2)}
      />

      <div className="space-y-1.5">
        <Label htmlFor="seed">{t("generate.seed")}</Label>
        <div className="flex gap-2">
          <Input
            id="seed"
            inputMode="numeric"
            value={form.seed}
            placeholder={t("generate.seedRandom")}
            className="font-mono tabular-nums"
            onChange={(event) =>
              update({ seed: event.target.value.replace(/[^\d]/g, "") })
            }
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            title={t("generate.seedReset")}
            onClick={() => update({ seed: "" })}
          >
            <Dices className="size-4" />
            <span className="sr-only">{t("generate.seedReset")}</span>
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="sampler">{t("generate.sampler")}</Label>
          <Select
            value={form.sampler}
            items={SAMPLER_OPTIONS.map((option) => ({
              value: option,
              label: formatSamplerLabel(option),
            }))}
            onValueChange={(value) => {
              if (
                typeof value === "string" &&
                SAMPLER_OPTIONS.some((option) => option === value)
              ) {
                update({ sampler: value as Sampler });
              }
            }}
          >
            <SelectTrigger id="sampler" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SAMPLER_OPTIONS.map((option) => (
                <SelectItem key={option} value={option}>
                  {formatSamplerLabel(option)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="noise-schedule">{t("generate.noiseSchedule")}</Label>
          <Select
            value={form.noiseSchedule}
            onValueChange={(value) => {
              if (
                typeof value === "string" &&
                NOISE_SCHEDULE_OPTIONS.some((option) => option === value)
              ) {
                update({ noiseSchedule: value as NoiseSchedule });
              }
            }}
          >
            <SelectTrigger id="noise-schedule" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {NOISE_SCHEDULE_OPTIONS.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="uc-preset">{t("generate.ucPreset")}</Label>
        <Select
          value={form.ucPreset}
          items={UC_PRESET_OPTIONS.map((option) => ({
            value: option.value,
            label: t(option.labelKey as MessageKey),
          }))}
          onValueChange={(value) => {
            const preset = UC_PRESET_OPTIONS.find(
              (option) => option.value === value
            );
            if (preset) update({ ucPreset: preset.value });
          }}
        >
          <SelectTrigger id="uc-preset" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {UC_PRESET_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {t(option.labelKey as MessageKey)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="quality-toggle" className="font-normal">
            {t("generate.qualityTags")}
          </Label>
          <Switch
            id="quality-toggle"
            checked={form.quality}
            onCheckedChange={(quality) => update({ quality })}
          />
        </div>
        <div className="flex items-center justify-between">
          <Label htmlFor="variety-toggle" className="font-normal">
            {t("generate.varietyBoost")}
          </Label>
          <Switch
            id="variety-toggle"
            checked={form.varietyBoost}
            onCheckedChange={(varietyBoost) => update({ varietyBoost })}
          />
        </div>
      </div>
    </div>
  );
}
