"use client";

import { Button } from "@nai-desktop-studio/ui/components/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@nai-desktop-studio/ui/components/select";
import { ImagePlus, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { LabeledSlider } from "@/components/labeled-slider";
import { SegmentedControl } from "@/components/segmented-control";
import { useT } from "@/i18n/provider";
import type { MessageKey } from "@/i18n/messages";

import { readImageFile } from "../lib/image-file";
import { supportsReferences } from "../lib/build-request";
import type { FormState } from "../types/generate";
import {
  MAX_REFERENCES,
  MAX_VIBES,
  REFERENCE_TYPE_LABEL_KEYS,
  REFERENCE_TYPES,
  type AdhocReference,
  type AdhocVibe,
  type ReferenceMode,
  type ReferenceType,
} from "../types/reference";

const DEFAULT_VIBE_STRENGTH = 0.6;
const DEFAULT_VIBE_INFO_EXTRACTED = 0.7;
const DEFAULT_REFERENCE_STRENGTH = 1;
const DEFAULT_REFERENCE_FIDELITY = 1;
const DEFAULT_I2I_STRENGTH = 0.7;
const DEFAULT_I2I_NOISE = 0;

function randomId() {
  return `ref-${crypto.randomUUID()}`;
}

function isReferenceType(value: string): value is ReferenceType {
  return REFERENCE_TYPES.some((type) => type === value);
}

function RemoveButton({ onClick }: { onClick: () => void }) {
  const t = useT();

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="size-6 shrink-0"
      title={t("action.delete")}
      onClick={onClick}
    >
      <Trash2 className="size-3.5" />
      <span className="sr-only">{t("action.delete")}</span>
    </Button>
  );
}

/**
 * A hidden input + button that just picks an image. The same shape is used in
 * three places, so it's factored out.
 */
function AddImageButton({
  label,
  disabled,
  onPick,
}: {
  label: string;
  disabled?: boolean;
  onPick: (file: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          // Reset every time so the same file can be picked again.
          event.target.value = "";
          if (file) onPick(file);
        }}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
      >
        <ImagePlus className="mr-1 size-4" />
        {label}
      </Button>
    </>
  );
}

// While dragging, move smoothly with local state and only propagate to the
// parent on commit. Updating the parent every frame re-renders the whole panel
// and gets heavy.
function VibeRow({
  vibe,
  onUpdate,
  onRemove,
}: {
  vibe: AdhocVibe;
  onUpdate: (patch: Partial<AdhocVibe>) => void;
  onRemove: () => void;
}) {
  const t = useT();
  const [strength, setStrength] = useState(vibe.strength);
  const [infoExtracted, setInfoExtracted] = useState(vibe.infoExtracted);

  return (
    <li className="flex items-start gap-2 rounded border p-2">
      <img
        src={vibe.previewUrl}
        alt=""
        className="size-12 shrink-0 rounded object-cover"
        decoding="async"
      />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex justify-end">
          <RemoveButton onClick={onRemove} />
        </div>
        <LabeledSlider
          label={t("reference.strength")}
          value={strength}
          min={0.01}
          max={1}
          step={0.01}
          onChange={setStrength}
          onCommit={(value) => onUpdate({ strength: value })}
          format={(value) => value.toFixed(2)}
        />
        <LabeledSlider
          label={t("reference.infoExtracted")}
          value={infoExtracted}
          min={0.01}
          max={1}
          step={0.01}
          onChange={setInfoExtracted}
          onCommit={(value) => onUpdate({ infoExtracted: value })}
          format={(value) => value.toFixed(2)}
        />
      </div>
    </li>
  );
}

function ReferenceRow({
  reference,
  onUpdate,
  onRemove,
}: {
  reference: AdhocReference;
  onUpdate: (patch: Partial<AdhocReference>) => void;
  onRemove: () => void;
}) {
  const t = useT();
  const [strength, setStrength] = useState(reference.strength);
  const [fidelity, setFidelity] = useState(reference.fidelity);

  return (
    <li className="flex items-start gap-2 rounded border p-2">
      <img
        src={reference.previewUrl}
        alt=""
        className="size-12 shrink-0 rounded object-cover"
        decoding="async"
      />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <Select
            value={reference.referenceType}
            // base-ui's SelectValue shows the raw value unless items is passed.
            items={REFERENCE_TYPES.map((type) => ({
              value: type,
              label: t(REFERENCE_TYPE_LABEL_KEYS[type] as MessageKey),
            }))}
            onValueChange={(value) => {
              if (typeof value === "string" && isReferenceType(value)) {
                onUpdate({ referenceType: value });
              }
            }}
          >
            <SelectTrigger className="h-7 w-full text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {REFERENCE_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {t(REFERENCE_TYPE_LABEL_KEYS[type] as MessageKey)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <RemoveButton onClick={onRemove} />
        </div>
        <LabeledSlider
          label={t("reference.strength")}
          value={strength}
          min={0.01}
          max={1}
          step={0.01}
          onChange={setStrength}
          onCommit={(value) => onUpdate({ strength: value })}
          format={(value) => value.toFixed(2)}
        />
        <LabeledSlider
          label={t("reference.fidelity")}
          value={fidelity}
          min={0}
          max={1}
          step={0.01}
          onChange={setFidelity}
          onCommit={(value) => onUpdate({ fidelity: value })}
          format={(value) => value.toFixed(2)}
        />
      </div>
    </li>
  );
}

function I2iRow({
  i2i,
  onUpdate,
  onRemove,
}: {
  i2i: NonNullable<FormState["i2i"]>;
  onUpdate: (patch: Partial<NonNullable<FormState["i2i"]>>) => void;
  onRemove: () => void;
}) {
  const t = useT();
  const [strength, setStrength] = useState(i2i.strength);
  const [noise, setNoise] = useState(i2i.noise);

  return (
    <div className="flex items-start gap-2 rounded border p-2">
      <img
        src={i2i.previewUrl}
        alt=""
        className="size-12 shrink-0 rounded object-cover"
        decoding="async"
      />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex justify-end">
          <RemoveButton onClick={onRemove} />
        </div>
        <LabeledSlider
          label={t("reference.i2i.strength")}
          value={strength}
          min={0.01}
          max={0.99}
          step={0.01}
          onChange={setStrength}
          onCommit={(value) => onUpdate({ strength: value })}
          format={(value) => value.toFixed(2)}
        />
        <LabeledSlider
          label={t("reference.i2i.noise")}
          value={noise}
          min={0}
          max={0.99}
          step={0.01}
          onChange={setNoise}
          onCommit={(value) => onUpdate({ noise: value })}
          format={(value) => value.toFixed(2)}
        />
      </div>
    </div>
  );
}

type Props = {
  form: Pick<
    FormState,
    "model" | "i2i" | "referenceMode" | "vibes" | "references"
  >;
  update: (patch: Partial<FormState>) => void;
};

/**
 * Reference-related settings. Per NovelAI's spec, vibe and precise reference
 * can't be combined in the same generation, so tabs make them exclusive. i2i is
 * a separate track that transforms the source image directly, so it can be used
 * alongside either.
 */
export function ReferenceSettings({ form, update }: Props) {
  const t = useT();
  const referenceAvailable = supportsReferences(form.model);

  async function handlePickI2i(file: File) {
    const read = await readImageFile(file);
    if (!read.ok) {
      toast.error(
        read.reason === "not-image"
          ? t("reference.error.notImage")
          : t("reference.error.tooLarge")
      );
      return;
    }
    if (form.i2i) URL.revokeObjectURL(form.i2i.previewUrl);
    update({
      i2i: {
        previewUrl: read.previewUrl,
        imageBase64: read.imageBase64,
        strength: DEFAULT_I2I_STRENGTH,
        noise: DEFAULT_I2I_NOISE,
      },
    });
  }

  async function handleAddVibe(file: File) {
    const read = await readImageFile(file);
    if (!read.ok) {
      toast.error(
        read.reason === "not-image"
          ? t("reference.error.notImage")
          : t("reference.error.tooLarge")
      );
      return;
    }
    update({
      vibes: [
        ...form.vibes,
        {
          id: randomId(),
          previewUrl: read.previewUrl,
          imageBase64: read.imageBase64,
          strength: DEFAULT_VIBE_STRENGTH,
          infoExtracted: DEFAULT_VIBE_INFO_EXTRACTED,
        },
      ],
    });
    toast.warning(t("reference.warn.vibeEncode"));
  }

  async function handleAddReference(file: File) {
    const read = await readImageFile(file);
    if (!read.ok) {
      toast.error(
        read.reason === "not-image"
          ? t("reference.error.notImage")
          : t("reference.error.tooLarge")
      );
      return;
    }
    update({
      references: [
        ...form.references,
        {
          id: randomId(),
          previewUrl: read.previewUrl,
          imageBase64: read.imageBase64,
          referenceType: "character",
          strength: DEFAULT_REFERENCE_STRENGTH,
          fidelity: DEFAULT_REFERENCE_FIDELITY,
        },
      ],
    });
    toast.warning(t("reference.warn.precise"));
  }

  function removeVibe(id: string) {
    const target = form.vibes.find((vibe) => vibe.id === id);
    if (target) URL.revokeObjectURL(target.previewUrl);
    update({ vibes: form.vibes.filter((vibe) => vibe.id !== id) });
  }

  function removeReference(id: string) {
    const target = form.references.find((reference) => reference.id === id);
    if (target) URL.revokeObjectURL(target.previewUrl);
    update({
      references: form.references.filter((reference) => reference.id !== id),
    });
  }

  return (
    <div className="space-y-4">
      <section className="space-y-2">
        <h4 className="text-muted-foreground text-[11px] font-medium">
          {t("reference.i2i.title")}
        </h4>
        {form.i2i ? (
          <I2iRow
            i2i={form.i2i}
            onUpdate={(patch) =>
              form.i2i && update({ i2i: { ...form.i2i, ...patch } })
            }
            onRemove={() => {
              if (form.i2i) URL.revokeObjectURL(form.i2i.previewUrl);
              update({ i2i: null });
            }}
          />
        ) : (
          <AddImageButton
            label={t("reference.i2i.pick")}
            onPick={handlePickI2i}
          />
        )}
      </section>

      <section className="space-y-2">
        <SegmentedControl
          label={t("reference.mode.label")}
          value={form.referenceMode}
          options={[
            { value: "vibe", label: t("reference.mode.vibe") },
            {
              value: "reference",
              label: t("reference.mode.precise"),
              disabled: !referenceAvailable,
            },
          ]}
          onChange={(referenceMode: ReferenceMode) => update({ referenceMode })}
        />

        {!referenceAvailable && (
          <p className="text-muted-foreground text-[10px] leading-tight">
            {t("reference.onlyV45")}
          </p>
        )}

        {form.referenceMode === "vibe" ? (
          <div className="space-y-2">
            {form.vibes.length > 0 && (
              <ul className="space-y-2">
                {form.vibes.map((vibe) => (
                  <VibeRow
                    key={vibe.id}
                    vibe={vibe}
                    onUpdate={(patch) =>
                      update({
                        vibes: form.vibes.map((item) =>
                          item.id === vibe.id ? { ...item, ...patch } : item
                        ),
                      })
                    }
                    onRemove={() => removeVibe(vibe.id)}
                  />
                ))}
              </ul>
            )}
            <AddImageButton
              label={
                form.vibes.length >= MAX_VIBES
                  ? t("reference.atMax")
                  : t("reference.vibe.add")
              }
              disabled={form.vibes.length >= MAX_VIBES}
              onPick={handleAddVibe}
            />
          </div>
        ) : (
          <div className="space-y-2">
            {form.references.length > 0 && (
              <ul className="space-y-2">
                {form.references.map((reference) => (
                  <ReferenceRow
                    key={reference.id}
                    reference={reference}
                    onUpdate={(patch) =>
                      update({
                        references: form.references.map((item) =>
                          item.id === reference.id
                            ? { ...item, ...patch }
                            : item
                        ),
                      })
                    }
                    onRemove={() => removeReference(reference.id)}
                  />
                ))}
              </ul>
            )}
            <AddImageButton
              label={
                form.references.length >= MAX_REFERENCES
                  ? t("reference.atMax")
                  : t("reference.precise.add")
              }
              disabled={
                !referenceAvailable || form.references.length >= MAX_REFERENCES
              }
              onPick={handleAddReference}
            />
          </div>
        )}
      </section>
    </div>
  );
}
