"use client";

import { Button } from "@nai-desktop-studio/ui/components/button";
import { ImagePlus, Trash2 } from "lucide-react";
import { useRef } from "react";

import { assetUrl } from "@/features/library/collections";
import { readImageFile } from "@/features/generate/lib/image-file";
import { useT } from "@/i18n/provider";

import type { StyleReferenceType } from "../types/style";

/**
 * A style image is either already stored on the server (a path) or a freshly
 * picked file that is only uploaded on save. Deferring the upload keeps a
 * cancelled edit from stranding orphan assets.
 */
export type DraftImage =
  | { source: "stored"; imagePath: string }
  | {
      source: "pending";
      previewUrl: string;
      imageBase64: string;
      contentType: string;
    };

export type DraftVibe = {
  id: string;
  image: DraftImage;
  strength: number;
  infoExtracted: number;
};

export type DraftReference = {
  id: string;
  image: DraftImage;
  referenceType: StyleReferenceType;
  strength: number;
  fidelity: number;
};

/** Preview source: the object URL for a pending file, else the served asset. */
export function imageSrc(image: DraftImage): string {
  return image.source === "pending"
    ? image.previewUrl
    : assetUrl(image.imagePath);
}

/** Frees the object URL a pending image holds; a no-op for stored images. */
export function revokeDraftImage(image: DraftImage): void {
  if (image.source === "pending") URL.revokeObjectURL(image.previewUrl);
}

export async function readPendingImage(
  file: File
): Promise<
  | { ok: true; image: Extract<DraftImage, { source: "pending" }> }
  | { ok: false; reason: "not-image" | "too-large" }
> {
  const read = await readImageFile(file);
  if (!read.ok) return { ok: false, reason: read.reason };
  return {
    ok: true,
    image: {
      source: "pending",
      previewUrl: read.previewUrl,
      imageBase64: read.imageBase64,
      contentType: file.type || "image/png",
    },
  };
}

export function RemoveButton({ onClick }: { onClick: () => void }) {
  const t = useT();
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-xs"
      className="shrink-0"
      title={t("styles.action.delete")}
      onClick={onClick}
    >
      <Trash2 />
      <span className="sr-only">{t("styles.action.delete")}</span>
    </Button>
  );
}

/** Hidden file input paired with a button. Resets so the same file re-picks. */
export function AddImageButton({
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
        <ImagePlus />
        {label}
      </Button>
    </>
  );
}
