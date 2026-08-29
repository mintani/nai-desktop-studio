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

import { useT } from "@/i18n/provider";

export type ReferenceCost = {
  /** Charged once for the run, not per image. */
  encoding: number;
  /** Vibes past the free ones, charged per image. */
  vibeSurcharge: number;
  /** Precise references, charged per image. */
  precise: number;
  total: number;
};

type Props = {
  open: boolean;
  /**
   * The breakdown to show. Assessed before the dialog opens, so it is present
   * whenever the dialog is; null only while closed.
   */
  cost: ReferenceCost | null;
  onConfirm: () => void;
  onCancel: () => void;
};

/**
 * Last stop before a run spends Anlas on reference images.
 *
 * Only the reference surcharge opens this, not the cost of the images
 * themselves — on a paid plan every generation costs something, and a dialog
 * in front of all of them would be a click to dismiss rather than a decision.
 * What is worth a decision is the part that is easy not to notice: encoding is
 * paid the moment the run starts, whatever comes out of it, and a precise
 * reference is paid again for every image in the batch.
 */
export function AnlasConfirmDialog({ open, cost, onConfirm, onCancel }: Props) {
  const t = useT();

  const lines: Array<{ key: string; text: string }> = [];
  if (cost) {
    if (cost.encoding > 0) {
      lines.push({
        key: "encoding",
        text: t("generate.anlasConfirm.encoding", { count: cost.encoding }),
      });
    }
    if (cost.vibeSurcharge > 0) {
      lines.push({
        key: "vibe",
        text: t("generate.anlasConfirm.vibe", { count: cost.vibeSurcharge }),
      });
    }
    if (cost.precise > 0) {
      lines.push({
        key: "precise",
        text: t("generate.anlasConfirm.precise", { count: cost.precise }),
      });
    }
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onCancel();
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t("generate.anlasConfirm.title")}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {cost
              ? t("generate.anlasConfirm.description", { count: cost.total })
              : t("generate.anlasConfirm.pending")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <ul className="text-muted-foreground list-disc space-y-1 pl-5 text-sm">
          {lines.map((line) => (
            <li key={line.key}>{line.text}</li>
          ))}
        </ul>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>
            {t("action.cancel")}
          </AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>
            {t("generate.anlasConfirm.confirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
