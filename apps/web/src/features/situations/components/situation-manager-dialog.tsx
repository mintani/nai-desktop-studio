"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@nai-desktop-studio/ui/components/dialog";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { collectGroupNames } from "@/components/group-field";
import { useCharacters } from "@/features/characters/hooks/queries";
import { useT } from "@/i18n/provider";

import {
  collectSituationVariableKeys,
  createEmptySituation,
  DEFAULT_SITUATION_CHARACTER_KEYS,
  INTERNAL_SITUATION_KEY_NAMES,
  type Situation,
} from "../lib/template";
import { useSituations } from "../hooks/queries";
import { SituationEditor } from "./situation-editor";
import { SituationList } from "./situation-list";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/**
 * Manage the local situation library: browse and search saved scene templates,
 * create/duplicate/delete them, and edit the selected one's four templates. A
 * dialog rather than a route, since the app is deliberately single-route.
 */
export function SituationManagerDialog({ open, onOpenChange }: Props) {
  const t = useT();
  const { situations, save, remove } = useSituations();
  const { characters } = useCharacters();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  // Keep a valid selection: fall back to the first situation whenever nothing is
  // selected (initial open, or after the selected one is deleted).
  useEffect(() => {
    if (selectedId && situations.some((item) => item.id === selectedId)) return;
    setSelectedId(situations[0]?.id ?? null);
  }, [situations, selectedId]);

  const selected = situations.find((item) => item.id === selectedId) ?? null;
  const groupOptions = useMemo(
    () => collectGroupNames(situations),
    [situations]
  );

  // What `{` offers. Three sources, because a key is only useful when both
  // sides agree on it: the presets, the keys other situations already ask for,
  // and the keys characters hold values for — that last one is how a value
  // stranded in the character editor gets wired to a scene.
  const templateTags = useMemo(() => {
    const internal = new Set(INTERNAL_SITUATION_KEY_NAMES);
    const keys = new Set<string>(DEFAULT_SITUATION_CHARACTER_KEYS);

    for (const key of collectSituationVariableKeys(situations)) keys.add(key);
    for (const character of characters) {
      for (const variable of character.variables) {
        const key = variable.key.trim();
        if (key && !internal.has(key)) keys.add(key);
      }
    }

    return [...keys].sort((a, b) => a.localeCompare(b));
  }, [situations, characters]);

  async function handleCreate() {
    setPending(true);
    const situation = createEmptySituation(t("situations.untitled"));
    try {
      await save.mutateAsync(situation);
      setSelectedId(situation.id);
      toast.success(t("situations.toast.created"));
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t("situations.toast.error")
      );
    } finally {
      setPending(false);
    }
  }

  async function handleDuplicate(source: Situation) {
    const now = new Date().toISOString();
    const copy: Situation = {
      ...source,
      id: crypto.randomUUID(),
      name: t("situations.copyName", { name: source.name }),
      variableKeys: source.variableKeys.map((entry) => ({
        ...entry,
        id: crypto.randomUUID(),
      })),
      createdAt: now,
      updatedAt: now,
    };
    await save.mutateAsync(copy);
    setSelectedId(copy.id);
    toast.success(t("situations.toast.duplicated"));
  }

  async function handleDelete(id: string) {
    await remove.mutateAsync(id);
    if (selectedId === id) setSelectedId(null);
    toast.success(t("situations.toast.deleted"));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[80dvh] max-w-4xl flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl">
        <DialogHeader className="border-b px-4 py-3 pr-12">
          <DialogTitle>{t("situations.title")}</DialogTitle>
          <DialogDescription>{t("situations.subtitle")}</DialogDescription>
        </DialogHeader>

        <div className="flex min-h-0 flex-1">
          <div className="w-64 shrink-0 border-r">
            <SituationList
              situations={situations}
              selectedId={selectedId}
              creating={pending}
              onSelect={setSelectedId}
              onCreate={handleCreate}
            />
          </div>

          <div className="min-w-0 flex-1">
            {selected ? (
              <SituationEditor
                key={selected.id}
                situation={selected}
                groupOptions={groupOptions}
                templateTags={templateTags}
                onSave={save.mutateAsync}
                onDuplicate={handleDuplicate}
                onDelete={handleDelete}
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-1 p-8 text-center">
                <p className="text-sm font-medium">
                  {t("situations.select.title")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t("situations.select.body")}
                </p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
