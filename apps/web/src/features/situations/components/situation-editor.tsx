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
import { Button } from "@nai-desktop-studio/ui/components/button";
import { Input } from "@nai-desktop-studio/ui/components/input";
import { Label } from "@nai-desktop-studio/ui/components/label";
import { ScrollArea } from "@nai-desktop-studio/ui/components/scroll-area";
import { Separator } from "@nai-desktop-studio/ui/components/separator";
import { Copy, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { GroupField } from "@/components/group-field";
import type { MessageKey } from "@/i18n/messages";
import { useT } from "@/i18n/provider";

import {
  appendSituationToken,
  mergeManagedSituationTokens,
  removeSituationToken,
  SITUATION_TARGETS,
  syncSituationVariableKeys,
  type Situation,
  type SituationTarget,
} from "../lib/template";
import { PromptEditorField } from "./prompt-editor-field";

const FIELD_LABEL_KEYS: Record<SituationTarget, MessageKey> = {
  basePrompt: "situations.field.basePrompt",
  baseNegative: "situations.field.baseNegative",
  characterPrompt: "situations.field.characterPrompt",
  characterNegativePrompt: "situations.field.characterNegativePrompt",
};

type Props = {
  situation: Situation;
  /** Group names the situation collection already uses. */
  groupOptions: readonly string[];
  /** Keys offered by `{` completion in the four fields. */
  templateTags: readonly string[];
  onSave: (situation: Situation) => Promise<unknown>;
  onDuplicate: (situation: Situation) => Promise<unknown>;
  onDelete: (id: string) => Promise<unknown>;
};

/**
 * Editor for a single situation. Holds a local draft so typing stays smooth; the
 * parent re-keys this component per selection, so the draft initializes cleanly
 * without an effect. Text is the source of truth — the draft is run through
 * {@link syncSituationVariableKeys} on blur and before every save so the derived
 * token list and the internal append-only slots stay correct.
 */
export function SituationEditor({
  situation,
  groupOptions,
  templateTags,
  onSave,
  onDuplicate,
  onDelete,
}: Props) {
  const t = useT();
  const [draft, setDraft] = useState<Situation>(situation);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);

  const dirty =
    draft.name !== situation.name ||
    draft.groupName !== situation.groupName ||
    draft.basePrompt !== situation.basePrompt ||
    draft.baseNegative !== situation.baseNegative ||
    draft.characterPrompt !== situation.characterPrompt ||
    draft.characterNegativePrompt !== situation.characterNegativePrompt;

  // The text box holds the field with its chip-managed tokens taken out, so an
  // edit rebuilds the whole field rather than replacing it — otherwise the
  // presets and the append-only slots would vanish on the first keystroke.
  function setField(target: SituationTarget, value: string) {
    setDraft((current) => ({
      ...current,
      [target]: mergeManagedSituationTokens(value, current[target], target),
    }));
  }

  function normalizeField() {
    setDraft((current) => syncSituationVariableKeys(current));
  }

  function addToken(target: SituationTarget, key: string) {
    setDraft((current) =>
      syncSituationVariableKeys({
        ...current,
        [target]: appendSituationToken(current[target], key),
      })
    );
  }

  function removeToken(target: SituationTarget, key: string) {
    setDraft((current) =>
      syncSituationVariableKeys({
        ...current,
        [target]: removeSituationToken(current[target], key),
      })
    );
  }

  async function handleSave() {
    setBusy(true);
    const synced = syncSituationVariableKeys({
      ...draft,
      name: draft.name.trim() || t("situations.untitled"),
      groupName: draft.groupName?.trim() ? draft.groupName.trim() : null,
      updatedAt: new Date().toISOString(),
    });
    try {
      await onSave(synced);
      setDraft(synced);
      toast.success(t("situations.toast.saved"));
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t("situations.toast.error")
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleDuplicate() {
    setBusy(true);
    try {
      await onDuplicate(situation);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t("situations.toast.error")
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    setConfirmDelete(false);
    setBusy(true);
    try {
      await onDelete(situation.id);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t("situations.toast.error")
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="grid grid-cols-2 gap-3 px-4 pt-4">
        <div className="space-y-1.5">
          <Label htmlFor="situation-name">{t("situations.name.label")}</Label>
          <Input
            id="situation-name"
            value={draft.name}
            onChange={(event) =>
              setDraft((current) => ({ ...current, name: event.target.value }))
            }
            placeholder={t("situations.name.placeholder")}
            autoComplete="off"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="situation-group">{t("group.label")}</Label>
          <GroupField
            id="situation-group"
            value={draft.groupName}
            options={groupOptions}
            onChange={(groupName) =>
              setDraft((current) => ({ ...current, groupName }))
            }
          />
        </div>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-5 p-4">
          {SITUATION_TARGETS.map((target) => (
            <PromptEditorField
              key={target}
              target={target}
              label={t(FIELD_LABEL_KEYS[target])}
              value={draft[target]}
              templateTags={templateTags}
              onChange={(value) => setField(target, value)}
              onBlur={normalizeField}
              onAddToken={(key) => addToken(target, key)}
              onRemoveToken={(key) => removeToken(target, key)}
            />
          ))}
        </div>
      </ScrollArea>

      <Separator />

      <div className="flex items-center gap-2 px-4 py-3">
        <Button
          type="button"
          variant="destructive"
          size="sm"
          disabled={busy}
          onClick={() => setConfirmDelete(true)}
        >
          <Trash2 aria-hidden />
          {t("action.delete")}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={busy}
          onClick={handleDuplicate}
        >
          <Copy aria-hidden />
          {t("situations.action.duplicate")}
        </Button>
        <div className="ml-auto flex items-center gap-2">
          {dirty && (
            <span className="text-xs text-muted-foreground">
              {t("situations.status.unsaved")}
            </span>
          )}
          <Button
            type="button"
            size="sm"
            disabled={busy || !dirty}
            onClick={handleSave}
          >
            {t("situations.action.save")}
          </Button>
        </div>
      </div>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("situations.delete.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("situations.delete.body", { name: situation.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("action.cancel")}</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleDelete}>
              {t("action.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
