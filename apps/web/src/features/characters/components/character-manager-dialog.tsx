"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@nai-desktop-studio/ui/components/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@nai-desktop-studio/ui/components/dialog";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { collectGroupNames } from "@/components/group-field";
import { useT } from "@/i18n/provider";

import { duplicateCharacter, useCharacters } from "../hooks/queries";
import { createEmptyCharacter, type Character } from "../lib/template";
import { CharacterEditor } from "./character-editor";
import { CharacterList } from "./character-list";

const AUTOSAVE_DELAY_MS = 400;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/**
 * Manages the local character collection. The selected character is edited in a
 * detached draft and written back with a debounced autosave, so typing never
 * blocks on the network and the list stays driven by the query cache.
 */
export function CharacterManagerDialog({ open, onOpenChange }: Props) {
  const t = useT();
  const { characters, isPending, save, remove } = useCharacters();

  const [draft, setDraft] = useState<Character | null>(null);
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Character | null>(null);

  // Autosave state lives in refs: the pending draft is captured per edit, so a
  // scheduled write still lands for the right character after the selection or
  // dialog changes. `save`/`t` are mirrored so `flush` can stay identity-stable.
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef<Character | null>(null);
  const saveRef = useRef(save);
  saveRef.current = save;
  const tRef = useRef(t);
  tRef.current = t;

  const flush = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const pending = pendingRef.current;
    pendingRef.current = null;
    if (!pending) return;
    saveRef.current.mutate(
      { ...pending, updatedAt: new Date().toISOString() },
      {
        onError: (error) =>
          toast.error(
            error instanceof Error
              ? error.message
              : tRef.current("characters.saveError")
          ),
      }
    );
  }, []);

  const scheduleSave = useCallback(
    (next: Character) => {
      pendingRef.current = next;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(flush, AUTOSAVE_DELAY_MS);
    },
    [flush]
  );

  // Persist a pending edit when the dialog closes and on unmount.
  useEffect(() => {
    if (!open) flush();
  }, [open, flush]);
  useEffect(() => () => flush(), [flush]);

  // Select the first character when opening with nothing selected.
  useEffect(() => {
    if (!open || draft) return;
    const first = characters[0];
    if (first) setDraft(first);
  }, [open, draft, characters]);

  // The cache lags edits by the debounce, so show the live draft in the list.
  const listCharacters = useMemo(() => {
    if (!draft) return characters;
    return characters.some((item) => item.id === draft.id)
      ? characters.map((item) => (item.id === draft.id ? draft : item))
      : [draft, ...characters];
  }, [characters, draft]);

  const groupOptions = useMemo(
    () => collectGroupNames(listCharacters),
    [listCharacters]
  );

  const handleChange = useCallback(
    (next: Character) => {
      setDraft(next);
      scheduleSave(next);
    },
    [scheduleSave]
  );

  function saveNow(character: Character) {
    save.mutate(character, {
      onError: (error) =>
        toast.error(
          error instanceof Error ? error.message : t("characters.saveError")
        ),
    });
  }

  function selectCharacter(id: string) {
    if (id === draft?.id) return;
    flush();
    const found = characters.find((item) => item.id === id);
    if (found) setDraft(found);
  }

  function handleCreate() {
    flush();
    const created = createEmptyCharacter(t("characters.newName"));
    setDraft(created);
    saveNow(created);
  }

  async function handleDuplicate(source: Character) {
    flush();
    const copy = await duplicateCharacter(
      source,
      t("characters.copyName", { name: source.name })
    );
    setDraft(copy);
    saveNow(copy);
  }

  async function confirmDelete() {
    const target = deleteTarget;
    if (!target) return;
    // Drop any pending autosave for this item so a late write can't resurrect it.
    if (pendingRef.current?.id === target.id) {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = null;
      pendingRef.current = null;
    }
    try {
      await remove.mutateAsync(target);
      if (draft?.id === target.id) {
        setDraft(characters.find((item) => item.id !== target.id) ?? null);
      }
      toast.success(t("characters.deleted", { name: target.name }));
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t("characters.deleteError")
      );
    } finally {
      setDeleteTarget(null);
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex h-[80vh] max-w-4xl flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl">
          <DialogHeader className="shrink-0 border-b px-4 py-3">
            <DialogTitle>{t("characters.title")}</DialogTitle>
          </DialogHeader>

          <div className="flex min-h-0 flex-1">
            <CharacterList
              characters={listCharacters}
              selectedId={draft?.id ?? null}
              search={search}
              onSearchChange={setSearch}
              onSelect={selectCharacter}
              onCreate={handleCreate}
              onDuplicate={(character) => void handleDuplicate(character)}
              onDelete={setDeleteTarget}
            />

            {draft ? (
              <CharacterEditor
                character={draft}
                groupOptions={groupOptions}
                onChange={handleChange}
              />
            ) : (
              <div className="text-muted-foreground flex min-h-0 flex-1 items-center justify-center p-6 text-center text-xs">
                {isPending ? null : t("characters.noSelection")}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(value) => {
          if (!value && !remove.isPending) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("characters.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("characters.deleteDescription", {
                name: deleteTarget?.name ?? "",
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={remove.isPending}>
              {t("action.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={remove.isPending}
              onClick={() => void confirmDelete()}
            >
              {t("action.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
