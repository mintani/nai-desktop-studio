"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@nai-desktop-studio/ui/components/card";
import { KeyRound, Loader2 } from "lucide-react";

import { useT } from "@/i18n/provider";

import { useSettings } from "../hooks/queries";
import { ApiKeyForm } from "./api-key-form";

/**
 * First-time setup gate. While the API key is unset, it hides the generation
 * screen and shows only the key input. Once saved, the useSettings cache updates
 * and it falls through to the main app.
 */
export function SetupGate({ children }: { children: React.ReactNode }) {
  const t = useT();
  const { data: settings, isPending } = useSettings();

  if (isPending) {
    return (
      <div className="flex h-svh items-center justify-center">
        <Loader2 className="text-muted-foreground size-6 animate-spin" />
      </div>
    );
  }

  if (settings?.hasApiKey) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-svh items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="bg-primary/10 text-primary mb-2 flex size-10 items-center justify-center rounded-full">
            <KeyRound className="size-5" />
          </div>
          <CardTitle>{t("settings.onboarding.title")}</CardTitle>
          <p className="text-muted-foreground text-sm">
            {t("settings.onboarding.body")}
          </p>
        </CardHeader>
        <CardContent>
          <ApiKeyForm submitLabel={t("settings.onboarding.submit")} />
        </CardContent>
      </Card>
    </div>
  );
}
