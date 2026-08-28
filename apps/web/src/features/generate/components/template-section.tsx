"use client";

import { Button } from "@nai-desktop-studio/ui/components/button";
import { Label } from "@nai-desktop-studio/ui/components/label";
import { cn } from "@nai-desktop-studio/ui/lib/utils";
import { ChevronRight, ImageIcon, X } from "lucide-react";
import { useMemo, useState } from "react";

import { CharacterManagerDialog } from "@/features/characters/components/character-manager-dialog";
import { useCharacters } from "@/features/characters/hooks/queries";
import { assetUrl } from "@/features/library/collections";
import { SituationManagerDialog } from "@/features/situations/components/situation-manager-dialog";
import { useSituations } from "@/features/situations/hooks/queries";
import { StyleManagerDialog } from "@/features/styles/components/style-manager-dialog";
import { useStyles } from "@/features/styles/hooks/queries";
import { useT } from "@/i18n/provider";

import type {
  TemplateCharacterPick,
  TemplateSelection,
} from "../types/template";
import { CharacterPickerDialog } from "./character-picker-dialog";
import { SelectedCharacterList } from "./selected-character-list";
import { SituationPickerDialog } from "./situation-picker-dialog";
import { StylePickerDialog } from "./style-picker-dialog";

type Props = {
  selection: TemplateSelection;
  onSelectionChange: (selection: TemplateSelection) => void;
  /** Images per scene. Shown so the run's total is not a surprise. */
  perScene: number;
  /** width / height of the image being made, passed to the placement frame. */
  aspect: number;
  /** V5 places anywhere on the frame; older models use the 5x5 grid. */
  freeform: boolean;
};

type Manager = "situations" | "characters" | "styles";
type Picker = "situations" | "characters" | "styles";

/** A row that opens a popup and reports what is chosen inside it. */
function PickerRow({
  label,
  summary,
  chosen,
  onOpen,
  children,
}: {
  label: string;
  summary: string;
  chosen: boolean;
  onOpen: () => void;
  children?: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Button
        type="button"
        variant="outline"
        className="w-full justify-between rounded-sm! px-2 font-normal"
        onClick={onOpen}
      >
        <span className="flex min-w-0 items-center gap-2">
          {children}
          <span className={cn("truncate", !chosen && "text-muted-foreground")}>
            {summary}
          </span>
        </span>
        <ChevronRight className="text-muted-foreground shrink-0" aria-hidden />
      </Button>
    </div>
  );
}

/**
 * Picks what the next run is made of: the scenes, the cast, the look.
 *
 * Nothing here writes into the prompt box. A run covers several situations, and
 * one prompt field can only hold one of them — so the panel keeps the choice and
 * the runner composes a prompt per scene when generate is pressed. Each of the
 * three is settled in its own popup, which is where there is room to show
 * pictures and groups; the panel keeps only the summary.
 */
export function TemplateSection({
  selection,
  onSelectionChange,
  perScene,
  aspect,
  freeform,
}: Props) {
  const t = useT();
  const { situations } = useSituations();
  const { characters, save } = useCharacters();
  const { styles } = useStyles();
  const [manager, setManager] = useState<Manager | null>(null);
  const [picker, setPicker] = useState<Picker | null>(null);
  // Which character the placement grid places next. Held here so the panel and
  // the picker are always placing the same one.
  const [activeId, setActiveId] = useState<string | null>(null);

  const style = styles.find((item) => item.id === selection.styleId) ?? null;

  // Only the situations that still exist. A scene deleted in its manager while
  // the panel stayed open must not count towards the run.
  const chosenSituations = useMemo(
    () =>
      selection.situationIds.flatMap((id) => {
        const found = situations.find((item) => item.id === id);
        return found ? [found] : [];
      }),
    [selection.situationIds, situations]
  );

  // Grouped, because that is the unit the picker selects in: a run of twelve
  // scenes is three groups, not twelve lines.
  const groupSummary = useMemo(() => {
    const map = new Map<string, number>();
    for (const situation of chosenSituations) {
      const key = situation.groupName ?? t("group.none");
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return [...map.entries()].map(([name, count]) => ({ name, count }));
  }, [chosenSituations, t]);

  const activeExists = selection.characters.some(
    (item) => item.id === activeId
  );
  const effectiveActiveId = activeExists
    ? activeId
    : (selection.characters[0]?.id ?? null);

  function setPicked(next: TemplateCharacterPick[]) {
    onSelectionChange({ ...selection, characters: next });
  }

  function dropGroup(name: string) {
    const keep = chosenSituations
      .filter((item) => (item.groupName ?? t("group.none")) !== name)
      .map((item) => item.id);
    onSelectionChange({ ...selection, situationIds: keep });
  }

  const total = chosenSituations.length * perScene;

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <PickerRow
          label={t("generate.template.situations")}
          chosen={chosenSituations.length > 0}
          summary={
            chosenSituations.length > 0
              ? t("generate.template.situationCount", {
                  count: chosenSituations.length,
                })
              : t("generate.template.pickSituations")
          }
          onOpen={() => setPicker("situations")}
        />
        {groupSummary.length > 0 && (
          <div className="flex max-h-24 flex-wrap gap-1 overflow-y-auto">
            {groupSummary.map((group) => (
              <span
                key={group.name}
                className="bg-muted flex max-w-full items-center gap-1 rounded-full border py-0.5 pr-0.5 pl-2 text-[10px]"
              >
                <span className="truncate">{group.name}</span>
                <span className="text-muted-foreground shrink-0 font-mono tabular-nums">
                  {group.count}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  className="text-muted-foreground hover:text-destructive size-4"
                  onClick={() => dropGroup(group.name)}
                  title={t("generate.template.dropGroup", {
                    name: group.name,
                  })}
                >
                  <X className="size-2.5" aria-hidden />
                  <span className="sr-only">
                    {t("generate.template.dropGroup", { name: group.name })}
                  </span>
                </Button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        <PickerRow
          label={t("generate.template.characters")}
          chosen={selection.characters.length > 0}
          summary={
            selection.characters.length > 0
              ? t("generate.template.characterCount", {
                  count: selection.characters.length,
                })
              : t("generate.template.pickCharacters")
          }
          onOpen={() => setPicker("characters")}
        />
        {/* Who is in the run, and where each one stands — but the 5x5 grid that
            sets that is the picker's job. It is the tallest control in the app
            and the panel is 340px wide; the cast is chosen once, so it lives
            where there is room for it. */}
        {selection.characters.length > 0 && (
          <SelectedCharacterList
            picked={selection.characters}
            characters={characters}
            onPickedChange={setPicked}
            freeform={freeform}
          />
        )}
      </div>

      <PickerRow
        label={t("generate.template.style")}
        chosen={style !== null}
        summary={style ? style.name : t("generate.template.pickStyle")}
        onOpen={() => setPicker("styles")}
      >
        <span className="bg-muted text-muted-foreground/60 flex size-5 shrink-0 items-center justify-center overflow-hidden rounded-sm">
          {style?.samplePath ? (
            <img
              src={assetUrl(style.samplePath)}
              alt=""
              className="size-full object-cover"
            />
          ) : (
            <ImageIcon className="size-3" aria-hidden />
          )}
        </span>
      </PickerRow>

      <p className="text-muted-foreground text-[11px] leading-snug">
        {total > 0
          ? t("generate.template.total", {
              count: total,
              scenes: chosenSituations.length,
              per: perScene,
            })
          : t("generate.template.hint")}
      </p>

      <SituationPickerDialog
        open={picker === "situations"}
        onOpenChange={(open) => setPicker(open ? "situations" : null)}
        situations={situations}
        selectedIds={selection.situationIds}
        onSelectedChange={(situationIds) =>
          onSelectionChange({ ...selection, situationIds })
        }
        onManage={() => setManager("situations")}
      />
      <CharacterPickerDialog
        open={picker === "characters"}
        onOpenChange={(open) => setPicker(open ? "characters" : null)}
        characters={characters}
        picked={selection.characters}
        onPickedChange={setPicked}
        activeId={effectiveActiveId}
        onActiveChange={setActiveId}
        aspect={aspect}
        freeform={freeform}
        onCharacterChange={(character) =>
          save.mutate({ ...character, updatedAt: new Date().toISOString() })
        }
        onManage={() => setManager("characters")}
      />
      <StylePickerDialog
        open={picker === "styles"}
        onOpenChange={(open) => setPicker(open ? "styles" : null)}
        styles={styles}
        selectedId={selection.styleId}
        onSelectedChange={(styleId) =>
          onSelectionChange({ ...selection, styleId })
        }
        onManage={() => setManager("styles")}
      />

      <SituationManagerDialog
        open={manager === "situations"}
        onOpenChange={(open) => setManager(open ? "situations" : null)}
      />
      <CharacterManagerDialog
        open={manager === "characters"}
        onOpenChange={(open) => setManager(open ? "characters" : null)}
      />
      <StyleManagerDialog
        open={manager === "styles"}
        onOpenChange={(open) => setManager(open ? "styles" : null)}
      />
    </div>
  );
}
