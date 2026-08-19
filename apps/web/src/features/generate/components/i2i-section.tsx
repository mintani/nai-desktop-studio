"use client";

import { Button } from "@nai-desktop-studio/ui/components/button";
import { X } from "lucide-react";
import { useState } from "react";

import { LabeledSlider } from "@/components/labeled-slider";
import { useT } from "@/i18n/provider";

import type { FormState } from "../types/generate";

type Props = {
  i2i: NonNullable<FormState["i2i"]>;
  update: (patch: Partial<FormState>) => void;
};

/**
 * The image this run starts from.
 *
 * Only on screen when there is one. It arrives by dropping a file on the
 * window or from a generated image, so there is no "choose a source" button
 * here — an empty control for something added elsewhere would be furniture.
 *
 * It sits directly under the prompt rather than among the reference images:
 * a source image is not a reference, it is the picture being redrawn, and
 * everything below is read as a change to it.
 */
export function I2iSection({ i2i, update }: Props) {
  const t = useT();
  // While dragging, move on local state and tell the parent on commit. Every
  // keystroke through the whole panel would re-render the viewer as well.
  const [strength, setStrength] = useState(i2i.strength);
  const [noise, setNoise] = useState(i2i.noise);

  return (
    <section className="space-y-2">
      <h4 className="text-muted-foreground text-[11px] font-medium">
        {t("reference.i2i.title")}
      </h4>
      <div className="flex items-start gap-2 rounded border p-2">
        <img
          src={i2i.previewUrl}
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
              onClick={() => {
                URL.revokeObjectURL(i2i.previewUrl);
                update({ i2i: null });
              }}
            >
              <X className="size-3.5" aria-hidden />
              <span className="sr-only">{t("action.delete")}</span>
            </Button>
          </div>
          <LabeledSlider
            label={t("reference.i2i.strength")}
            value={strength}
            min={0.01}
            max={0.99}
            step={0.01}
            onChange={setStrength}
            onCommit={(value) => update({ i2i: { ...i2i, strength: value } })}
            format={(value) => value.toFixed(2)}
          />
          <LabeledSlider
            label={t("reference.i2i.noise")}
            value={noise}
            min={0}
            max={0.99}
            step={0.01}
            onChange={setNoise}
            onCommit={(value) => update({ i2i: { ...i2i, noise: value } })}
            format={(value) => value.toFixed(2)}
          />
        </div>
      </div>
    </section>
  );
}
