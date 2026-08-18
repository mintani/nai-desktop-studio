"use client";

import { Button } from "@nai-desktop-studio/ui/components/button";
import { Input } from "@nai-desktop-studio/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@nai-desktop-studio/ui/components/select";
import { cn } from "@nai-desktop-studio/ui/lib/utils";
import { FolderPlus } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { useT } from "@/i18n/provider";

const NONE = "__none__";

/** Every group name a collection is already using, sorted for display. */
export function collectGroupNames(
  items: readonly { groupName: string | null }[]
): string[] {
  const names = new Set<string>();
  for (const item of items) {
    const name = item.groupName?.trim();
    if (name) names.add(name);
  }
  return [...names].sort((a, b) => a.localeCompare(b, "ja"));
}

type Props = {
  id: string;
  /** The current group, or null for ungrouped. */
  value: string | null;
  /** Group names already in use — see {@link collectGroupNames}. */
  options: readonly string[];
  onChange: (value: string | null) => void;
  className?: string;
};

/**
 * Picks the group an item belongs to.
 *
 * A group is only a name repeated on each record — there is no list of groups
 * anywhere — so typing it by hand is how a collection ends up holding "School"
 * and "school" as two separate shelves. Every name already in use is offered in
 * the list, and the button beside it is the only way to write a new one.
 */
export function GroupField({ id, value, options, onChange, className }: Props) {
  const t = useT();
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState("");
  // Escape unmounts the input, and whether that fires a blur is up to the
  // browser. The flag makes the cancel win either way.
  const cancelledRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Asking for a new group is asking to type one, so the caret goes there.
  useEffect(() => {
    if (naming) inputRef.current?.focus();
  }, [naming]);

  function commit() {
    if (cancelledRef.current) return;
    const trimmed = name.trim();
    setNaming(false);
    setName("");
    if (trimmed) onChange(trimmed);
  }

  if (naming) {
    return (
      <Input
        id={id}
        ref={inputRef}
        value={name}
        onChange={(event) => setName(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            commit();
          }
          if (event.key === "Escape") {
            cancelledRef.current = true;
            setNaming(false);
            setName("");
          }
        }}
        placeholder={t("group.newPlaceholder")}
        autoComplete="off"
        className={className}
      />
    );
  }

  // A group named a moment ago is not in the collection until the save lands,
  // so the current value is folded in — otherwise the field would come back
  // blank right after naming one.
  const names =
    value && !options.includes(value) ? [value, ...options] : [...options];
  const items = [
    { value: NONE, label: t("group.none") },
    ...names.map((option) => ({ value: option, label: option })),
  ];

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <Select
        value={value ?? NONE}
        items={items}
        onValueChange={(next) => {
          if (typeof next !== "string") return;
          onChange(next === NONE ? null : next);
        }}
      >
        <SelectTrigger id={id} className="min-w-0 flex-1">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>
            <span className="text-muted-foreground">{t("group.none")}</span>
          </SelectItem>
          {names.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        type="button"
        variant="outline"
        size="icon"
        title={t("group.new")}
        onClick={() => {
          cancelledRef.current = false;
          setNaming(true);
        }}
      >
        <FolderPlus />
        <span className="sr-only">{t("group.new")}</span>
      </Button>
    </div>
  );
}
