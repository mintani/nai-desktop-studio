"use client";

import { Button } from "@nai-desktop-studio/ui/components/button";
import { Input } from "@nai-desktop-studio/ui/components/input";
import { Label } from "@nai-desktop-studio/ui/components/label";
import { CheckCircle2, Eye, EyeOff, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { useT } from "@/i18n/provider";

import { verifyApiKey } from "../api";
import { useSaveSettings } from "../hooks/queries";
import type { Subscription } from "../types";

type Props = {
  /** Called when saving succeeds. Onboarding switches screens here. */
  onSaved?: () => void;
  /**
   * Label for the save button. Onboarding and the settings dialog use different
   * wording.
   */
  submitLabel?: string;
};

/**
 * Form for saving the NovelAI persistent token. Before saving, it always
 * verifies connectivity through the server and writes only a key that passed
 * (preventing the accident of saving an invalid key and only noticing at
 * generation time).
 */
export function ApiKeyForm({ onSaved, submitLabel }: Props) {
  const t = useT();
  const saveSettings = useSaveSettings();
  const [apiKey, setApiKey] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState<Subscription | null>(null);

  const trimmed = apiKey.trim();
  const busy = verifying || saveSettings.isPending;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!trimmed) {
      toast.error(t("settings.apiKey.errorEmpty"));
      return;
    }

    setVerifying(true);
    try {
      // The verify endpoint returns 200 with ok:false even on failure. Save only
      // a key that passed.
      const result = await verifyApiKey(trimmed);
      if (!result.ok) {
        throw new Error(result.error ?? t("settings.apiKey.errorVerify"));
      }
      setVerified(result.subscription);
      await saveSettings.mutateAsync({ apiKey: trimmed });
      setApiKey("");
      toast.success(t("settings.apiKey.saved"));
      onSaved?.();
    } catch (error) {
      setVerified(null);
      toast.error(
        error instanceof Error
          ? error.message
          : t("settings.apiKey.errorVerify")
      );
    } finally {
      setVerifying(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="novelai-api-key">{t("settings.apiKey.label")}</Label>
        <div className="flex gap-2">
          <Input
            id="novelai-api-key"
            type={revealed ? "text" : "password"}
            value={apiKey}
            autoComplete="off"
            spellCheck={false}
            placeholder="pst-..."
            onChange={(event) => {
              setApiKey(event.target.value);
              setVerified(null);
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            title={
              revealed ? t("settings.apiKey.hide") : t("settings.apiKey.reveal")
            }
            onClick={() => setRevealed((current) => !current)}
          >
            {revealed ? (
              <EyeOff className="size-4" />
            ) : (
              <Eye className="size-4" />
            )}
            <span className="sr-only">
              {revealed
                ? t("settings.apiKey.hide")
                : t("settings.apiKey.reveal")}
            </span>
          </Button>
        </div>
        <p className="text-muted-foreground text-xs leading-relaxed">
          {t("settings.apiKey.help")}
        </p>
      </div>

      {verified && (
        <div className="flex items-center gap-2 rounded-md border border-emerald-600/40 bg-emerald-500/10 px-3 py-2 text-xs">
          <CheckCircle2 className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span>
            {t("settings.apiKey.verified", {
              count: verified.anlas.toLocaleString(),
            })}
          </span>
        </div>
      )}

      <Button type="submit" disabled={busy || !trimmed} className="w-full">
        {busy && <Loader2 className="mr-1.5 size-4 animate-spin" />}
        {verifying
          ? t("settings.apiKey.verifying")
          : (submitLabel ?? t("settings.apiKey.save"))}
      </Button>
    </form>
  );
}
