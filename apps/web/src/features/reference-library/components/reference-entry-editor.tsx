"use client";

import { ScrollArea } from "@nai-desktop-studio/ui/components/scroll-area";

import type { MessageKey } from "@/i18n/messages";
import { useT } from "@/i18n/provider";

import { referenceImageUrl } from "../lib/api";
import {
  REFERENCE_KIND_LABEL_KEYS,
  type ReferenceEntry,
} from "../types/reference";
import {
  ReferenceEntryFields,
  ReferenceEntryStatus,
} from "./reference-entry-fields";

type Props = {
  entry: ReferenceEntry;
  /** Group names the library already uses. */
  groupOptions: readonly string[];
  onChange: (next: ReferenceEntry) => void;
};

/**
 * Editor for one saved entry. The image is fixed — a different image is a
 * different entry — so it is shown, not edited, and only the settings around
 * it change.
 */
export function ReferenceEntryEditor({ entry, groupOptions, onChange }: Props) {
  const t = useT();

  function patch(next: Partial<ReferenceEntry>) {
    onChange({ ...entry, ...next });
  }

  return (
    <ScrollArea className="min-h-0 flex-1">
      <div className="flex items-start gap-4 p-4">
        <span className="bg-muted block size-40 shrink-0 overflow-hidden rounded-md border">
          <img
            src={referenceImageUrl(entry.id)}
            alt=""
            decoding="async"
            className="size-full object-cover"
          />
        </span>
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="bg-muted rounded-full border px-2 py-0.5 text-[10px]">
              {t(REFERENCE_KIND_LABEL_KEYS[entry.kind] as MessageKey)}
            </span>
            <ReferenceEntryStatus entry={entry} />
          </div>
          <ReferenceEntryFields
            entry={entry}
            groupOptions={groupOptions}
            onPatch={patch}
          />
        </div>
      </div>
    </ScrollArea>
  );
}
