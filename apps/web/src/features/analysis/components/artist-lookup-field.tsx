"use client";

import { Input } from "@nai-desktop-studio/ui/components/input";
import { cn } from "@nai-desktop-studio/ui/lib/utils";
import { useState } from "react";

import { useTagSearch } from "@/hooks/use-tag-search";
import { useT } from "@/i18n/provider";

type Props = {
  /** The committed tag, bare — no `artist:` prefix. */
  value: string;
  onChange: (name: string) => void;
};

/**
 * Picks the artist tag to ask the classifier about.
 *
 * Suggestions come from the Danbooru tag list so the spelling matches what the
 * model was trained on. Enter still commits the typed text as it stands: the
 * tag list and the model's artist list are two different lists, and a name
 * missing from the first can be in the second.
 */
export function ArtistLookupField({ value, onChange }: Props) {
  const t = useT();
  const [draft, setDraft] = useState(value);
  const [open, setOpen] = useState(false);
  const { results } = useTagSearch(open ? draft : "", 8);
  const suggestions = results.filter((tag) => tag.isArtist);

  function commit(name: string) {
    setDraft(name);
    setOpen(false);
    onChange(name);
  }

  return (
    <div className="relative">
      <Input
        value={draft}
        placeholder={t("analysis.artist.lookupPlaceholder")}
        className="h-8 font-mono"
        autoComplete="off"
        spellCheck={false}
        onChange={(event) => {
          setDraft(event.target.value);
          setOpen(true);
        }}
        onBlur={() => setOpen(false)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            commit(draft.trim());
          }
          if (event.key === "Escape") setOpen(false);
        }}
      />
      {open && suggestions.length > 0 && (
        <div
          role="listbox"
          aria-label={t("analysis.artist.lookupLabel")}
          className="bg-popover absolute top-full right-0 left-0 z-10 mt-1 max-h-48 overflow-y-auto rounded-md border shadow-none"
        >
          {suggestions.map((tag) => (
            <button
              key={tag.name}
              type="button"
              role="option"
              aria-selected={tag.name === value}
              // The input blurs before a click lands, which would close the
              // list and take the click target with it.
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => commit(tag.name)}
              className={cn(
                "hover:bg-accent flex w-full items-center gap-2 px-2 py-1 text-left",
                tag.name === value && "bg-accent"
              )}
            >
              <span className="min-w-0 flex-1 truncate font-mono text-[0.6875rem]">
                {tag.displayName}
              </span>
              <span className="text-muted-foreground shrink-0 font-mono text-[0.625rem] tabular-nums">
                {tag.count.toLocaleString()}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
