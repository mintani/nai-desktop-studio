"use client";

import { Button } from "@nai-desktop-studio/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@nai-desktop-studio/ui/components/dropdown-menu";
import { Languages } from "lucide-react";

import { LOCALES, LOCALE_LABELS } from "@/i18n/locale";
import { useI18n } from "@/i18n/provider";

export function LocaleToggle() {
  const { locale, setLocale, t } = useI18n();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="outline" size="icon" />}
        title={t("workspace.language")}
      >
        <Languages className="size-4" />
        <span className="sr-only">{t("workspace.language")}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {LOCALES.map((value) => (
          <DropdownMenuItem
            key={value}
            onClick={() => setLocale(value)}
            data-selected={value === locale ? "" : undefined}
          >
            {LOCALE_LABELS[value]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
