"use client";

import { Label } from "@nai-desktop-studio/ui/components/label";

import { TagAutocompleteTextarea } from "@/components/tag-autocomplete/tag-autocomplete-textarea";
import { useT } from "@/i18n/provider";

import type { FormState } from "../types/generate";

type Props = {
  form: Pick<FormState, "prompt" | "negativePrompt">;
  update: (patch: Partial<FormState>) => void;
};

export function PromptSection({ form, update }: Props) {
  const t = useT();

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="prompt">{t("generate.prompt")}</Label>
        <TagAutocompleteTextarea
          id="prompt"
          rows={5}
          value={form.prompt}
          onChange={(prompt) => update({ prompt })}
          placeholder={t("generate.promptPlaceholder")}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="negative-prompt">{t("generate.negativePrompt")}</Label>
        <TagAutocompleteTextarea
          id="negative-prompt"
          rows={2}
          value={form.negativePrompt}
          onChange={(negativePrompt) => update({ negativePrompt })}
          placeholder={t("generate.negativePlaceholder")}
        />
      </div>
    </div>
  );
}
