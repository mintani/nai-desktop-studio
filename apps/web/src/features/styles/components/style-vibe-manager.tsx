"use client";

import { useState } from "react";
import { toast } from "sonner";

import { LabeledSlider } from "@/components/labeled-slider";
import { useT } from "@/i18n/provider";

import { MAX_STYLE_VIBES } from "../types/style";
import {
  AddImageButton,
  imageSrc,
  readPendingImage,
  RemoveButton,
  revokeDraftImage,
  type DraftVibe,
} from "./style-image-picker";

const DEFAULT_STRENGTH = 0.6;
const DEFAULT_INFO_EXTRACTED = 0.7;

// Local slider state moves smoothly while dragging and only reaches the parent
// on commit, so the whole editor doesn't re-render every frame.
function VibeRow({
  vibe,
  onUpdate,
  onRemove,
}: {
  vibe: DraftVibe;
  onUpdate: (patch: Partial<DraftVibe>) => void;
  onRemove: () => void;
}) {
  const t = useT();
  const [strength, setStrength] = useState(vibe.strength);
  const [infoExtracted, setInfoExtracted] = useState(vibe.infoExtracted);

  return (
    <li className="flex items-start gap-2 rounded-sm border p-2">
      <img
        src={imageSrc(vibe.image)}
        alt=""
        className="size-12 shrink-0 rounded-sm object-cover"
        decoding="async"
      />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex justify-end">
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
          label={t("styles.infoExtracted")}
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

type Props = {
  vibes: DraftVibe[];
  onChange: (vibes: DraftVibe[]) => void;
  /** Vibe and precise reference can't be combined in one generation. */
  blocked: boolean;
};

export function StyleVibeManager({ vibes, onChange, blocked }: Props) {
  const t = useT();
  const atMax = vibes.length >= MAX_STYLE_VIBES;

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
      ...vibes,
      {
        id: crypto.randomUUID(),
        image: read.image,
        strength: DEFAULT_STRENGTH,
        infoExtracted: DEFAULT_INFO_EXTRACTED,
      },
    ]);
  }

  function updateVibe(id: string, patch: Partial<DraftVibe>) {
    onChange(
      vibes.map((vibe) => (vibe.id === id ? { ...vibe, ...patch } : vibe))
    );
  }

  function removeVibe(id: string) {
    const target = vibes.find((vibe) => vibe.id === id);
    if (target) revokeDraftImage(target.image);
    onChange(vibes.filter((vibe) => vibe.id !== id));
  }

  return (
    <div className="space-y-3 rounded-md border p-3">
      <div className="space-y-1">
        <h4 className="text-sm font-medium">{t("styles.vibes.title")}</h4>
        <p className="text-muted-foreground text-xs leading-tight">
          {t("styles.vibes.hint", { max: MAX_STYLE_VIBES })}
        </p>
        <p className="text-muted-foreground text-xs leading-tight">
          {t("styles.vibes.encodeNote")}
        </p>
        {blocked && (
          <p className="text-xs leading-tight text-amber-600">
            {t("styles.vibes.blocked")}
          </p>
        )}
      </div>

      {vibes.length > 0 ? (
        <ul className="space-y-2">
          {vibes.map((vibe) => (
            <VibeRow
              key={vibe.id}
              vibe={vibe}
              onUpdate={(patch) => updateVibe(vibe.id, patch)}
              onRemove={() => removeVibe(vibe.id)}
            />
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground text-xs">
          {t("styles.vibes.empty")}
        </p>
      )}

      <AddImageButton
        label={atMax ? t("styles.atMax") : t("styles.vibes.add")}
        disabled={blocked || atMax}
        onPick={handleAdd}
      />
    </div>
  );
}
