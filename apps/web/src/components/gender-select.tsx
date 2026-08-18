"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@nai-desktop-studio/ui/components/select";
import { cn } from "@nai-desktop-studio/ui/lib/utils";

import {
  CHARACTER_GENDERS,
  type CharacterGender,
} from "@/features/characters/lib/template";
import type { MessageKey } from "@/i18n/messages";
import { useT } from "@/i18n/provider";

const NONE = "__none__";

const LABEL_KEYS: Record<CharacterGender, MessageKey> = {
  girl: "characters.genderGirl",
  boy: "characters.genderBoy",
  other: "characters.genderOther",
};

type Props = {
  id?: string;
  value: CharacterGender | null;
  onChange: (value: CharacterGender | null) => void;
  className?: string;
};

/**
 * The subject word at the head of one character's caption — the same three the
 * official app offers, in the same place: on the character, where you are
 * writing it.
 *
 * Shared because both modes need it. The batch panel's cast comes from the
 * library and the normal panel's is typed by hand, but NovelAI reads them the
 * same way, so they are set the same way.
 */
export function GenderSelect({ id, value, onChange, className }: Props) {
  const t = useT();

  const items = [
    { value: NONE, label: t("characters.genderNone") },
    ...CHARACTER_GENDERS.map((gender) => ({
      value: gender,
      label: t(LABEL_KEYS[gender]),
    })),
  ];

  return (
    <Select
      value={value ?? NONE}
      items={items}
      onValueChange={(next) => {
        if (typeof next !== "string") return;
        onChange(CHARACTER_GENDERS.find((item) => item === next) ?? null);
      }}
    >
      <SelectTrigger
        id={id}
        size="sm"
        aria-label={t("characters.gender")}
        className={cn("w-full", className)}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {items.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.value === NONE ? (
              <span className="text-muted-foreground">{item.label}</span>
            ) : (
              item.label
            )}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
