"use client";

import { MAX_CHARACTER_REFERENCES } from "@nai-desktop-studio/novelai/constants";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@nai-desktop-studio/ui/components/select";
import { useState } from "react";
import { toast } from "sonner";

import { LabeledSlider } from "@/components/labeled-slider";
import { useT } from "@/i18n/provider";
import type { MessageKey } from "@/i18n/messages";

import { STYLE_REFERENCE_TYPES, type StyleReferenceType } from "../types/style";
import {
  AddImageButton,
  imageSrc,
  readPendingImage,
  RemoveButton,
  revokeDraftImage,
  type DraftReference,
} from "./style-image-picker";

const DEFAULT_STRENGTH = 1;
const DEFAULT_FIDELITY = 1;

const REFERENCE_TYPE_LABEL_KEYS: Record<StyleReferenceType, MessageKey> = {
  character: "styles.refType.character",
  style: "styles.refType.style",
  "character&style": "styles.refType.characterStyle",
};

function isReferenceType(value: unknown): value is StyleReferenceType {
  return (
    typeof value === "string" &&
    (STYLE_REFERENCE_TYPES as readonly string[]).includes(value)
  );
}

function ReferenceRow({
  reference,
  onUpdate,
  onRemove,
}: {
  reference: DraftReference;
  onUpdate: (patch: Partial<DraftReference>) => void;
  onRemove: () => void;
}) {
  const t = useT();
  const [strength, setStrength] = useState(reference.strength);
  const [fidelity, setFidelity] = useState(reference.fidelity);

  return (
    <li className="flex items-start gap-2 rounded-sm border p-2">
      <img
        src={imageSrc(reference.image)}
        alt=""
        className="size-12 shrink-0 rounded-sm object-cover"
        decoding="async"
      />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <Select
            value={reference.referenceType}
            items={STYLE_REFERENCE_TYPES.map((type) => ({
              value: type,
              label: t(REFERENCE_TYPE_LABEL_KEYS[type]),
            }))}
            onValueChange={(value) => {
              if (isReferenceType(value)) onUpdate({ referenceType: value });
            }}
          >
            <SelectTrigger size="sm" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STYLE_REFERENCE_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {t(REFERENCE_TYPE_LABEL_KEYS[type])}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <RemoveButton onClick={onRemove} />
        </div>
        <LabeledSlider
          label={t("styles.strength")}
          value={strength}
          min={0.01}
          max={1}
          step={0.01}
          onChange={setStrength}
          onCommit={(value) => onUpdate({ strength: value })}
          format={(value) => value.toFixed(2)}
        />
        <LabeledSlider
          label={t("styles.fidelity")}
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

type Props = {
  references: DraftReference[];
  onChange: (references: DraftReference[]) => void;
  /** Vibe and precise reference can't be combined in one generation. */
  blocked: boolean;
};

export function StyleReferenceManager({
  references,
  onChange,
  blocked,
}: Props) {
  const t = useT();
  const atMax = references.length >= MAX_CHARACTER_REFERENCES;

  async function handleAdd(file: File) {
    const read = await readPendingImage(file);
    if (!read.ok) {
      toast.error(
        read.reason === "not-image"
          ? t("styles.image.notImage")
          : t("styles.image.tooLarge")
      );
      return;
    }
    onChange([
      ...references,
      {
        id: crypto.randomUUID(),
        image: read.image,
        referenceType: "character",
        strength: DEFAULT_STRENGTH,
        fidelity: DEFAULT_FIDELITY,
      },
    ]);
  }

  function updateReference(id: string, patch: Partial<DraftReference>) {
    onChange(
      references.map((reference) =>
        reference.id === id ? { ...reference, ...patch } : reference
      )
    );
  }

  function removeReference(id: string) {
    const target = references.find((reference) => reference.id === id);
    if (target) revokeDraftImage(target.image);
    onChange(references.filter((reference) => reference.id !== id));
  }

  return (
    <div className="space-y-3 rounded-md border p-3">
      <div className="space-y-1">
        <h4 className="text-sm font-medium">{t("styles.references.title")}</h4>
        <p className="text-muted-foreground text-xs leading-tight">
          {t("styles.references.hint", { max: MAX_CHARACTER_REFERENCES })}
        </p>
        {blocked && (
          <p className="text-xs leading-tight text-amber-600">
            {t("styles.references.blocked")}
          </p>
        )}
      </div>

      {references.length > 0 ? (
        <ul className="space-y-2">
          {references.map((reference) => (
            <ReferenceRow
              key={reference.id}
              reference={reference}
              onUpdate={(patch) => updateReference(reference.id, patch)}
              onRemove={() => removeReference(reference.id)}
            />
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground text-xs">
          {t("styles.references.empty")}
        </p>
      )}

      <AddImageButton
        label={atMax ? t("styles.atMax") : t("styles.references.add")}
        disabled={blocked || atMax}
        onPick={handleAdd}
      />
    </div>
  );
}
