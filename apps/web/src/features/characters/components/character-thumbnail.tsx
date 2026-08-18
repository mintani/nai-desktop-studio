"use client";

import { cn } from "@nai-desktop-studio/ui/lib/utils";
import { UserRound } from "lucide-react";

import { assetUrl } from "@/features/library/collections";

import type { Character } from "../lib/template";

type Props = {
  character: Pick<Character, "name" | "imagePath">;
  /** Owns the size, the radius and the edge — this only fills the box. */
  className?: string;
};

/**
 * The character's picture wherever it appears next to its name. A span rather
 * than a div, because most of the places it goes are inside a button.
 */
export function CharacterThumbnail({ character, className }: Props) {
  return (
    <span
      className={cn(
        "bg-muted text-muted-foreground/60 flex shrink-0 items-center justify-center overflow-hidden",
        className
      )}
    >
      {character.imagePath ? (
        <img
          src={assetUrl(character.imagePath)}
          alt=""
          draggable={false}
          className="size-full object-cover select-none"
        />
      ) : (
        <UserRound className="size-1/2" aria-hidden />
      )}
    </span>
  );
}
