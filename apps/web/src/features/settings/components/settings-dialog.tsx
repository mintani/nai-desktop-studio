"use client";

import { Button } from "@nai-desktop-studio/ui/components/button";
import { Checkbox } from "@nai-desktop-studio/ui/components/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@nai-desktop-studio/ui/components/dialog";
import { Input } from "@nai-desktop-studio/ui/components/input";
import { Label } from "@nai-desktop-studio/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@nai-desktop-studio/ui/components/select";
import { Separator } from "@nai-desktop-studio/ui/components/separator";
import { useState } from "react";
import { toast } from "sonner";

import { MODEL_OPTIONS, PANEL_SECTIONS } from "@/features/generate/constants";
import type { MessageKey } from "@/i18n/messages";
import { useT } from "@/i18n/provider";

import {
  useSaveSettings,
  useSettings,
  useSubscription,
} from "../hooks/queries";
import type { GenerationMode, Plan } from "../types";
import { ApiKeyForm } from "./api-key-form";

const PLAN_OPTIONS: { value: Plan; labelKey: MessageKey }[] = [
  { value: "opus", labelKey: "settings.plan.opus" },
  { value: "other", labelKey: "settings.plan.other" },
];

const MODE_OPTIONS: { value: GenerationMode; labelKey: MessageKey }[] = [
  { value: "queue", labelKey: "settings.mode.queue" },
  { value: "alternate", labelKey: "settings.mode.alternate" },
];

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function SettingsDialog({ open, onOpenChange }: Props) {
  const t = useT();
  const { data: settings } = useSettings();
  const { data: subscription } = useSubscription(Boolean(settings?.hasApiKey));
  const saveSettings = useSaveSettings();
  const [outputDir, setOutputDir] = useState<string | null>(null);

  // While unedited, mirror the saved value directly (so state doesn't need
  // resetting each time the dialog opens).
  const outputDirValue = outputDir ?? settings?.outputDir ?? "";
  const outputDirDirty =
    outputDir !== null && outputDir.trim() !== settings?.outputDir;

  async function handleChangePlan(plan: Plan) {
    try {
      await saveSettings.mutateAsync({ plan });
      toast.success(t("settings.plan.saved"));
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t("settings.output.errorSave")
      );
    }
  }

  async function handleChangeMode(generationMode: GenerationMode) {
    try {
      await saveSettings.mutateAsync({ generationMode });
      toast.success(t("settings.mode.saved"));
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t("settings.output.errorSave")
      );
    }
  }

  const openSections = settings?.openSections ?? [];

  async function toggleSection(id: string) {
    const next = openSections.includes(id)
      ? openSections.filter((item) => item !== id)
      : [...openSections, id];
    try {
      await saveSettings.mutateAsync({ openSections: next });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t("settings.output.errorSave")
      );
    }
  }

  async function handleChangeModel(defaultModel: string) {
    try {
      await saveSettings.mutateAsync({ defaultModel });
      toast.success(t("settings.model.saved"));
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t("settings.output.errorSave")
      );
    }
  }

  async function handleSaveOutputDir() {
    const next = outputDirValue.trim();
    if (!next) {
      toast.error(t("settings.output.errorEmpty"));
      return;
    }
    try {
      await saveSettings.mutateAsync({ outputDir: next });
      setOutputDir(null);
      toast.success(t("settings.output.saved"));
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t("settings.output.errorSave")
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("settings.title")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">
                {t("settings.account.title")}
              </h3>
              {subscription && (
                <span className="text-muted-foreground text-xs tabular-nums">
                  {t("settings.account.anlasRemaining", {
                    count: subscription.anlas.toLocaleString(),
                  })}
                </span>
              )}
            </div>
            {settings?.apiKeyPreview && (
              <p className="text-muted-foreground font-mono text-xs">
                {t("settings.account.currentKey", {
                  key: settings.apiKeyPreview,
                })}
              </p>
            )}
            <ApiKeyForm submitLabel={t("settings.apiKey.update")} />
          </section>

          <Separator />

          <section className="space-y-2">
            <Label htmlFor="plan">{t("settings.plan.label")}</Label>
            <Select
              value={settings?.plan ?? "other"}
              items={PLAN_OPTIONS.map((option) => ({
                value: option.value,
                label: t(option.labelKey),
              }))}
              onValueChange={(value) => {
                const plan = PLAN_OPTIONS.find(
                  (option) => option.value === value
                );
                if (plan && plan.value !== settings?.plan) {
                  void handleChangePlan(plan.value);
                }
              }}
            >
              <SelectTrigger id="plan" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PLAN_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {t(option.labelKey)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {subscription && (
              <p className="text-muted-foreground font-mono text-xs tabular-nums">
                {t("settings.plan.detected", { tier: subscription.tier })}
              </p>
            )}
            <p className="text-muted-foreground text-xs">
              {t("settings.plan.help")}
            </p>
          </section>

          <Separator />

          <section className="space-y-2">
            <Label htmlFor="generation-mode">{t("settings.mode.label")}</Label>
            <Select
              value={settings?.generationMode ?? "queue"}
              items={MODE_OPTIONS.map((option) => ({
                value: option.value,
                label: t(option.labelKey),
              }))}
              onValueChange={(value) => {
                const mode = MODE_OPTIONS.find(
                  (option) => option.value === value
                );
                if (mode && mode.value !== settings?.generationMode) {
                  void handleChangeMode(mode.value);
                }
              }}
            >
              <SelectTrigger id="generation-mode" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MODE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {t(option.labelKey)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-muted-foreground text-xs">
              {t("settings.mode.help")}
            </p>
          </section>

          <Separator />

          <section className="space-y-2">
            <Label htmlFor="default-model">{t("settings.model.label")}</Label>
            <Select
              value={
                MODEL_OPTIONS.find(
                  (option) => option.value === settings?.defaultModel
                )?.value ?? "nai-diffusion-5-full"
              }
              items={MODEL_OPTIONS.map((option) => ({
                value: option.value,
                label: option.label,
              }))}
              onValueChange={(value) => {
                const option = MODEL_OPTIONS.find(
                  (item) => item.value === value
                );
                if (option && option.value !== settings?.defaultModel) {
                  void handleChangeModel(option.value);
                }
              }}
            >
              <SelectTrigger id="default-model" className="w-full">
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
            <p className="text-muted-foreground text-xs">
              {t("settings.model.help")}
            </p>
          </section>

          <Separator />

          <section className="space-y-2">
            <Label htmlFor="output-dir">{t("settings.output.label")}</Label>
            <div className="flex gap-2">
              <Input
                id="output-dir"
                value={outputDirValue}
                spellCheck={false}
                onChange={(event) => setOutputDir(event.target.value)}
              />
              <Button
                type="button"
                variant="outline"
                disabled={!outputDirDirty || saveSettings.isPending}
                onClick={handleSaveOutputDir}
              >
                {t("settings.output.change")}
              </Button>
            </div>
            <p className="text-muted-foreground text-xs">
              {t("settings.output.help")}
            </p>
          </section>

          <Separator />

          {/* Checkboxes rather than one of the three "selected" idioms: this is
              a set, not a choice among alternatives, and a checkbox is already
              its own mark. */}
          <section className="space-y-2">
            <Label>{t("settings.sections.label")}</Label>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              {PANEL_SECTIONS.map((section) => (
                <Label
                  key={section.id}
                  className="flex items-center gap-2 py-1.5 font-normal"
                >
                  <Checkbox
                    checked={openSections.includes(section.id)}
                    onCheckedChange={() => void toggleSection(section.id)}
                  />
                  {t(section.labelKey)}
                </Label>
              ))}
            </div>
            <p className="text-muted-foreground text-xs">
              {t("settings.sections.help")}
            </p>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
