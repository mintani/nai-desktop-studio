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
import { readImageFile } from "@/features/generate/lib/image-file";
import { useT } from "@/i18n/provider";

import { duplicateReferenceInput, useReferences } from "../hooks/queries";
import {
  createEmptyReference,
  type ReferenceEntry,
  type ReferenceKind,
} from "../types/reference";
import { ReferenceEntryEditor } from "./reference-entry-editor";
import { ReferenceEntryList } from "./reference-entry-list";

const AUTOSAVE_DELAY_MS = 400;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Which side of the library this store shows: vibes or precise references. */
  kind: ReferenceKind;
};

/**
 * The vibe store: manages the saved entries of one kind the way the character
 * manager does — a searchable, grouped list beside an editor. The selected
 * entry is edited in a detached draft and written back with a debounced
 * autosave, so typing never blocks on the network and the list stays driven by
 * the query cache.
 */
export function ReferenceManagerDialog({ open, onOpenChange, kind }: Props) {
  const t = useT();
  const { references, isPending, create, save, remove } = useReferences();

  const [draft, setDraft] = useState<ReferenceEntry | null>(null);
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<ReferenceEntry | null>(null);

  // Autosave state lives in refs: the pending draft is captured per edit, so a
  // scheduled write still lands for the right entry after the selection or
  // dialog changes. `save`/`t` are mirrored so `flush` can stay identity-stable.
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef<ReferenceEntry | null>(null);
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
    saveRef.current.mutate(pending, {
      // The server owns `encodedAt` — changing infoExtracted drops the stored
      // encode — so fold it back into the draft. Only that field and the
      // timestamps, so edits typed while the save was in flight survive.
      onSuccess: (saved) => {
        setDraft((current) =>
          current && current.id === saved.id
            ? {
                ...current,
                encodedAt: saved.encodedAt,
                updatedAt: saved.updatedAt,
              }
            : current
        );
      },
      onError: (error) =>
        toast.error(
          error instanceof Error
            ? error.message
            : tRef.current("referenceLibrary.saveError")
        ),
    });
  }, []);

  const scheduleSave = useCallback(
    (next: ReferenceEntry) => {
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

  const ofKind = useMemo(
    () => references.filter((entry) => entry.kind === kind),
    [references, kind]
  );

  // Select the first entry when opening with nothing selected. The dialog is
  // reused for both kinds, so a draft of the other kind counts as nothing.
  useEffect(() => {
    if (!open || draft?.kind === kind) return;
    setDraft(ofKind[0] ?? null);
  }, [open, draft, kind, ofKind]);

  // The cache lags edits by the debounce, so show the live draft in the list.
  const listEntries = useMemo(() => {
    if (!draft || draft.kind !== kind) return ofKind;
    return ofKind.some((item) => item.id === draft.id)
      ? ofKind.map((item) => (item.id === draft.id ? draft : item))
      : [draft, ...ofKind];
  }, [ofKind, draft, kind]);

  const groupOptions = useMemo(
    () => collectGroupNames(listEntries),
    [listEntries]
  );

  const handleChange = useCallback(
    (next: ReferenceEntry) => {
      setDraft(next);
      scheduleSave(next);
    },
    [scheduleSave]
  );

  function selectEntry(id: string) {
    if (id === draft?.id) return;
    flush();
    const found = ofKind.find((item) => item.id === id);
    if (found) setDraft(found);
  }

  async function handleAdd(file: File) {
    const read = await readImageFile(file);
    if (!read.ok) {
      toast.error(
        read.reason === "not-image"
          ? t("reference.error.notImage")
          : t("reference.error.tooLarge")
      );
      return;
    }
    // Only the bytes are needed; the list shows the server's copy.
    URL.revokeObjectURL(read.previewUrl);
    flush();
    const seed = createEmptyReference(
      kind,
      file.name.replace(/\.[^.]+$/, "") || t("referenceLibrary.newName")
    );
    try {
      const entry = await create.mutateAsync({
        metadata: {
          name: seed.name,
          groupName: seed.groupName,
          kind: seed.kind,
          strength: seed.strength,
          infoExtracted: seed.infoExtracted,
          referenceType: seed.referenceType,
          fidelity: seed.fidelity,
        },
        imageBase64: read.imageBase64,
        contentType: file.type || "image/png",
      });
      setDraft(entry);
    } catch {
      toast.error(t("referenceLibrary.saveError"));
    }
  }

  async function handleDuplicate(source: ReferenceEntry) {
    flush();
    const input = await duplicateReferenceInput(
      source,
      t("referenceStore.copyName", { name: source.name })
    );
    if (!input) {
      toast.error(t("referenceStore.duplicateError"));
      return;
    }
    try {
      setDraft(await create.mutateAsync(input));
    } catch {
      toast.error(t("referenceStore.duplicateError"));
    }
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
        setDraft(ofKind.find((item) => item.id !== target.id) ?? null);
      }
      toast.success(t("referenceStore.deleted", { name: target.name }));
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t("referenceStore.deleteError")
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
            <DialogTitle>
              {t(
                kind === "vibe"
                  ? "referenceStore.vibeTitle"
                  : "referenceStore.referenceTitle"
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="flex min-h-0 flex-1">
            <ReferenceEntryList
              entries={listEntries}
              selectedId={draft?.id ?? null}
              search={search}
              onSearchChange={setSearch}
              onSelect={selectEntry}
              onAdd={(file) => void handleAdd(file)}
              adding={create.isPending}
              onDuplicate={(entry) => void handleDuplicate(entry)}
              onDelete={setDeleteTarget}
            />

            {draft ? (
              <ReferenceEntryEditor
                entry={draft}
                groupOptions={groupOptions}
                onChange={handleChange}
              />
            ) : (
              <div className="text-muted-foreground flex min-h-0 flex-1 items-center justify-center p-6 text-center text-xs">
                {isPending ? null : t("referenceStore.noSelection")}
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
            <AlertDialogTitle>
              {t("referenceStore.deleteTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("referenceStore.deleteDescription", {
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
