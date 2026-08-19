"use client";

import { Button } from "@nai-desktop-studio/ui/components/button";
import { Paintbrush, X } from "lucide-react";
import { useState } from "react";

import { LabeledSlider } from "@/components/labeled-slider";
import { useT } from "@/i18n/provider";

import type { FormState } from "../types/generate";

type Props = {
  inpaint: NonNullable<FormState["inpaint"]>;
  update: (patch: Partial<FormState>) => void;
  onEditMask: () => void;
};

/**
 * The image being partly redrawn, and how far the masked part may move.
 *
 * The mask itself is not shown here — a 56px thumbnail cannot say which pixels
 * were painted, and pretending otherwise would be worse than sending the
 * person back to the editor to look.
 */
export function InpaintSection({ inpaint, update, onEditMask }: Props) {
  const t = useT();
  const [strength, setStrength] = useState(inpaint.strength);

  return (
    <section className="space-y-2">
      <h4 className="text-muted-foreground text-[11px] font-medium">
        {t("inpaint.section")}
      </h4>
      <div className="flex items-start gap-2 rounded border p-2">
        <img
          src={inpaint.previewUrl}
          alt=""
          className="size-14 shrink-0 rounded object-cover"
          decoding="async"
        />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex justify-end">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-6 shrink-0"
              title={t("action.delete")}
              onClick={() => update({ inpaint: null })}
            >
              <X className="size-3.5" aria-hidden />
              <span className="sr-only">{t("action.delete")}</span>
            </Button>
          </div>
          <LabeledSlider
            label={t("inpaint.strength")}
            value={strength}
            min={0.01}
            max={1}
            step={0.01}
            onChange={setStrength}
            onCommit={(value) =>
              update({ inpaint: { ...inpaint, strength: value } })
            }
            format={(value) => value.toFixed(2)}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full"
            onClick={onEditMask}
          >
            <Paintbrush className="mr-1 size-3.5" aria-hidden />
            {t("inpaint.edit")}
          </Button>
        </div>
      </div>
    </section>
  );
}
