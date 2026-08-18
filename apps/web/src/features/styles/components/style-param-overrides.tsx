"use client";

import { Checkbox } from "@nai-desktop-studio/ui/components/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@nai-desktop-studio/ui/components/collapsible";
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
import { ChevronDown } from "lucide-react";
import { useState } from "react";

import { LabeledSlider } from "@/components/labeled-slider";
import {
  MODEL_OPTIONS,
  NOISE_SCHEDULE_OPTIONS,
  SAMPLER_OPTIONS,
} from "@/features/generate/constants";
import { useT } from "@/i18n/provider";

import type {
  StyleGenerationParams,
  StyleNoiseSchedule,
  StyleSampler,
} from "../types/style";

// Sensible starting points when a row is switched on, matching the generate
// panel defaults so a style begins from the same place the user would.
const ENABLE_DEFAULTS = {
  model: "nai-diffusion-4-5-full",
  steps: 28,
  scale: 5,
  cfgRescale: 0,
  varietyBoost: false,
  sampler: "k_euler_ancestral",
  noiseSchedule: "karras",
} as const;

type Props = {
  params: StyleGenerationParams;
  onChange: (patch: Partial<StyleGenerationParams>) => void;
};

/** A labelled row with an on/off switch that decides whether it overrides. */
function OverrideRow({
  label,
  enabled,
  onToggle,
  children,
}: {
  label: string;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  children: React.ReactNode;
}) {
  const t = useT();
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-[11px]">{label}</Label>
        <Switch
          size="sm"
          checked={enabled}
          onCheckedChange={onToggle}
          aria-label={t("styles.params.enable")}
        />
      </div>
      {enabled && children}
    </div>
  );
}

export function StyleParamOverrides({ params, onChange }: Props) {
  const t = useT();
  const [open, setOpen] = useState(false);

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="rounded-md border"
    >
      <CollapsibleTrigger className="flex w-full items-center justify-between gap-2 p-3 text-left">
        <span className="text-sm font-medium">{t("styles.params.title")}</span>
        <ChevronDown
          className={cn(
            "text-muted-foreground size-4 transition-transform duration-150",
            open && "rotate-180"
          )}
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-4 border-t p-3">
        <p className="text-muted-foreground text-xs leading-tight">
          {t("styles.params.hint")}
        </p>

        <OverrideRow
          label={t("styles.params.model")}
          enabled={params.model !== null}
          onToggle={(on) =>
            onChange({ model: on ? ENABLE_DEFAULTS.model : null })
          }
        >
          <Select
            value={params.model ?? ENABLE_DEFAULTS.model}
            items={MODEL_OPTIONS.map((option) => ({
              value: option.value,
              label: option.label,
            }))}
            onValueChange={(value) => {
              const model = MODEL_OPTIONS.find(
                (option) => option.value === value
              );
              if (model) onChange({ model: model.value });
            }}
          >
            <SelectTrigger className="w-full">
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
        </OverrideRow>

        <OverrideRow
          label={t("styles.params.steps")}
          enabled={params.steps !== null}
          onToggle={(on) =>
            onChange({ steps: on ? ENABLE_DEFAULTS.steps : null })
          }
        >
          <LabeledSlider
            label={t("styles.params.steps")}
            value={params.steps ?? ENABLE_DEFAULTS.steps}
            min={1}
            max={50}
            step={1}
            onChange={(steps) => onChange({ steps })}
          />
        </OverrideRow>

        <OverrideRow
          label={t("styles.params.scale")}
          enabled={params.scale !== null}
          onToggle={(on) =>
            onChange({ scale: on ? ENABLE_DEFAULTS.scale : null })
          }
        >
          <LabeledSlider
            label={t("styles.params.scale")}
            value={params.scale ?? ENABLE_DEFAULTS.scale}
            min={0}
            max={10}
            step={0.1}
            onChange={(scale) => onChange({ scale })}
            format={(value) => value.toFixed(1)}
          />
        </OverrideRow>

        <OverrideRow
          label={t("styles.params.cfgRescale")}
          enabled={params.cfgRescale !== null}
          onToggle={(on) =>
            onChange({ cfgRescale: on ? ENABLE_DEFAULTS.cfgRescale : null })
          }
        >
          <LabeledSlider
            label={t("styles.params.cfgRescale")}
            value={params.cfgRescale ?? ENABLE_DEFAULTS.cfgRescale}
            min={0}
            max={1}
            step={0.01}
            onChange={(cfgRescale) => onChange({ cfgRescale })}
            format={(value) => value.toFixed(2)}
          />
        </OverrideRow>

        <OverrideRow
          label={t("styles.params.sampler")}
          enabled={params.sampler !== null}
          onToggle={(on) =>
            onChange({ sampler: on ? ENABLE_DEFAULTS.sampler : null })
          }
        >
          <Select
            value={params.sampler ?? ENABLE_DEFAULTS.sampler}
            onValueChange={(value) => {
              if (
                typeof value === "string" &&
                SAMPLER_OPTIONS.some((option) => option === value)
              ) {
                onChange({ sampler: value as StyleSampler });
              }
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SAMPLER_OPTIONS.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </OverrideRow>

        <OverrideRow
          label={t("styles.params.noiseSchedule")}
          enabled={params.noiseSchedule !== null}
          onToggle={(on) =>
            onChange({
              noiseSchedule: on ? ENABLE_DEFAULTS.noiseSchedule : null,
            })
          }
        >
          <Select
            value={params.noiseSchedule ?? ENABLE_DEFAULTS.noiseSchedule}
            onValueChange={(value) => {
              if (
                typeof value === "string" &&
                NOISE_SCHEDULE_OPTIONS.some((option) => option === value)
              ) {
                onChange({ noiseSchedule: value as StyleNoiseSchedule });
              }
            }}
          >
            <SelectTrigger className="w-full">
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
        </OverrideRow>

        <OverrideRow
          label={t("styles.params.varietyBoost")}
          enabled={params.varietyBoost !== null}
          onToggle={(on) =>
            onChange({ varietyBoost: on ? ENABLE_DEFAULTS.varietyBoost : null })
          }
        >
          <label className="flex w-fit items-center gap-2 rounded-sm border px-2 py-1 text-[11px]">
            <Checkbox
              checked={params.varietyBoost ?? false}
              onCheckedChange={(checked) =>
                onChange({ varietyBoost: checked === true })
              }
            />
            {t("styles.params.varietyBoost")}
          </label>
        </OverrideRow>
      </CollapsibleContent>
    </Collapsible>
  );
}
