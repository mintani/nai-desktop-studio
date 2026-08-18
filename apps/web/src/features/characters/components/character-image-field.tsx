"use client";

import { Button } from "@nai-desktop-studio/ui/components/button";
import { ImagePlus, Loader2, X } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { readImageFile } from "@/features/generate/lib/image-file";
import {
  assetUrl,
  deleteAssetsByPath,
  uploadAsset,
} from "@/features/library/collections";
import { useT } from "@/i18n/provider";

type Props = {
  imagePath: string | null;
  onChange: (imagePath: string | null) => void;
};

/**
 * The character's picture. A name alone doesn't say who a character is, so the
 * picker leads with this.
 *
 * It uploads as soon as a file is picked rather than on save: the editor writes
 * through a debounced autosave and has no save button to defer to. The image it
 * replaces is deleted right away, otherwise the assets directory would keep
 * every attempt.
 */
export function CharacterImageField({ imagePath, onChange }: Props) {
  const t = useT();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function pick(file: File) {
    const read = await readImageFile(file);
    if (!read.ok) {
      toast.error(
        read.reason === "not-image"
          ? t("reference.error.notImage")
          : t("reference.error.tooLarge")
      );
      return;
    }
    URL.revokeObjectURL(read.previewUrl);

    setBusy(true);
    try {
      const uploaded = await uploadAsset(
        read.imageBase64,
        file.type || "image/png"
      );
      const previous = imagePath;
      onChange(uploaded.path);
      if (previous) void deleteAssetsByPath([previous]);
    } catch {
      toast.error(t("characters.imageError"));
    } finally {
      setBusy(false);
    }
  }

  function remove() {
    if (!imagePath) return;
    void deleteAssetsByPath([imagePath]);
    onChange(null);
  }

  return (
    <div className="w-20 shrink-0 space-y-1">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) void pick(file);
        }}
      />
      <button
        type="button"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        title={
          imagePath ? t("characters.imageChange") : t("characters.imageAdd")
        }
        className="bg-muted/30 text-muted-foreground hover:border-primary/50 hover:text-foreground focus-visible:ring-ring/50 flex aspect-[3/4] w-full items-center justify-center overflow-hidden rounded-sm border border-dashed transition-[color,border-color] duration-150 ease-out outline-none focus-visible:ring-1 disabled:opacity-60"
      >
        {busy ? (
          <Loader2 className="size-4 animate-spin" aria-hidden />
        ) : imagePath ? (
          <img
            src={assetUrl(imagePath)}
            alt=""
            className="size-full object-cover"
          />
        ) : (
          <ImagePlus className="size-4" aria-hidden />
        )}
        <span className="sr-only">
          {imagePath ? t("characters.imageChange") : t("characters.imageAdd")}
        </span>
      </button>
      {imagePath && (
        <Button
          type="button"
          variant="ghost"
          size="xs"
          className="text-muted-foreground w-full"
          onClick={remove}
        >
          <X />
          {t("characters.imageRemove")}
        </Button>
      )}
    </div>
  );
}
