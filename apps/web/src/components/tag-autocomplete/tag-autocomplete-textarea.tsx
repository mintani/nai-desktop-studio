"use client";

import { Badge } from "@nai-desktop-studio/ui/components/badge";
import { Textarea } from "@nai-desktop-studio/ui/components/textarea";
import { cn } from "@nai-desktop-studio/ui/lib/utils";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  TAG_SEARCH_LIMIT,
} from "@/features/generate/constants";
import { useTagSearch, type TagResult } from "@/hooks/use-tag-search";
import { useT } from "@/i18n/provider";

import { getCurrentBraceToken, getCurrentTagToken } from "./token";

function formatCount(count: number) {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(0)}k`;
  return String(count);
}

/** What the caret is in the middle of writing. */
type Mode = "tag" | "template";

const DROPDOWN_MAX_HEIGHT = 288;
/** Below this, opening downwards shows too little to be worth it. */
const DROPDOWN_MIN_HEIGHT = 160;
const DROPDOWN_GAP = 8;

/**
 * The edges of the nearest ancestor that would clip the dropdown. These fields
 * sit inside scrolling panels, so the window is the wrong thing to measure
 * against — a list that fits on screen can still be cut off by the panel.
 */
function clippingEdges(node: HTMLElement) {
  for (let el = node.parentElement; el; el = el.parentElement) {
    if (/auto|scroll|hidden/.test(getComputedStyle(el).overflowY)) {
      const rect = el.getBoundingClientRect();
      return { top: rect.top, bottom: rect.bottom };
    }
  }
  return { top: 0, bottom: window.innerHeight };
}

/** Which way the list opens, and how tall it may be. */
function dropdownBox(textarea: HTMLTextAreaElement) {
  const rect = textarea.getBoundingClientRect();
  const clip = clippingEdges(textarea);
  const below = clip.bottom - rect.bottom - DROPDOWN_GAP;
  const above = rect.top - clip.top - DROPDOWN_GAP;
  const up = below < DROPDOWN_MIN_HEIGHT && above > below;
  return {
    up,
    maxHeight: Math.max(Math.min(up ? above : below, DROPDOWN_MAX_HEIGHT), 72),
  };
}

type Option =
  | { kind: "tag"; tag: TagResult }
  | { kind: "template"; name: string };

type Props = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  className?: string;
  rows?: number;
  placeholder?: string;
  /**
   * Template keys offered while a `{` is open. Memoize it in the caller — a
   * fresh array every render re-runs the match.
   */
  templateTags?: readonly string[];
};

/**
 * Textarea with inline completion. Only the token right before the caret is
 * searched, and on commit that token is replaced and `, ` is appended (other
 * tags are left untouched).
 *
 * There are two things a caret can be writing. Inside an unclosed `{` it is a
 * template key, which names a slot a character fills — the Danbooru dictionary
 * has nothing to say about those, so the list switches to `templateTags`.
 * Anywhere else it is an ordinary tag.
 */
export function TagAutocompleteTextarea({
  id,
  value,
  onChange,
  onBlur,
  className,
  rows = 4,
  placeholder,
  templateTags,
}: Props) {
  const t = useT();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<Mode>("tag");
  const [box, setBox] = useState({ up: false, maxHeight: DROPDOWN_MAX_HEIGHT });

  const hasTemplateTags = templateTags !== undefined && templateTags.length > 0;

  const { results, isLoading } = useTagSearch(
    isOpen && mode === "tag" ? query : "",
    TAG_SEARCH_LIMIT
  );

  const options = useMemo<Option[]>(() => {
    if (mode === "tag") {
      return results.map((tag) => ({ kind: "tag", tag }));
    }
    const text = query.trim().toLowerCase();
    return (templateTags ?? [])
      .filter((name) => name.toLowerCase().includes(text))
      .sort((a, b) => {
        const rank =
          Number(b.toLowerCase().startsWith(text)) -
          Number(a.toLowerCase().startsWith(text));
        return rank || a.localeCompare(b);
      })
      .slice(0, TAG_SEARCH_LIMIT)
      .map((name) => ({ kind: "template", name }));
  }, [mode, results, templateTags, query]);

  const syncToken = useCallback(
    (text: string, caret: number) => {
      const open = () => {
        const textarea = textareaRef.current;
        if (textarea) setBox(dropdownBox(textarea));
        setIsOpen(true);
        setSelectedIndex(0);
      };

      // An open brace wins: it is unambiguous, and the text inside it is a key
      // rather than a tag.
      const brace = hasTemplateTags ? getCurrentBraceToken(text, caret) : null;
      if (brace) {
        setMode("template");
        setQuery(brace.query);
        open();
        return;
      }

      setMode("tag");
      const token = getCurrentTagToken(text, caret);
      if (token.query.trim().length > 0) {
        setQuery(token.query.trim());
        open();
      } else {
        setIsOpen(false);
        setQuery("");
      }
    },
    [hasTemplateTags]
  );

  const handleSelect = useCallback(
    (option: Option) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const caret = textarea.selectionStart;
      let head: string;
      let tail: string;
      let text: string;

      if (option.kind === "template") {
        const brace = getCurrentBraceToken(value, caret);
        head = value.slice(0, brace?.start ?? caret);
        tail = value.slice(caret);
        // Do not end up with `{key}}` when the brace was already closed.
        if (tail.startsWith("}")) tail = tail.slice(1);
        text = `{${option.name}}`;
      } else {
        const token = getCurrentTagToken(value, caret);
        // The prefix (weight notation etc.) stays before queryStart, so replace
        // only the body.
        head = value.slice(0, token.queryStart);
        tail = value.slice(caret);
        text = option.tag.isArtist
          ? `artist:${option.tag.name}`
          : option.tag.name;
      }

      const separator = tail.trimStart().startsWith(",") ? "" : ", ";
      onChange(`${head}${text}${separator}${tail}`);
      setIsOpen(false);
      setQuery("");

      const nextCaret = head.length + text.length + separator.length;
      requestAnimationFrame(() => {
        textarea.setSelectionRange(nextCaret, nextCaret);
        textarea.focus();
      });
    },
    [value, onChange]
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Leave the IME alone: swallowing Enter mid-conversion would steal the
      // commit rather than accept a suggestion.
      if (event.nativeEvent.isComposing) return;
      if (!isOpen || options.length === 0) return;

      if (event.key === "ArrowDown") {
        event.preventDefault();
        setSelectedIndex((index) => (index + 1) % options.length);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setSelectedIndex(
          (index) => (index - 1 + options.length) % options.length
        );
      } else if (event.key === "Tab" || event.key === "Enter") {
        const selected = options[selectedIndex];
        if (selected) {
          event.preventDefault();
          handleSelect(selected);
        }
      } else if (event.key === "Escape") {
        event.preventDefault();
        setIsOpen(false);
      }
    },
    [isOpen, options, selectedIndex, handleSelect]
  );

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        dropdownRef.current?.contains(target) !== true &&
        textareaRef.current?.contains(target) !== true
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  useEffect(() => {
    dropdownRef.current
      ?.querySelector("[data-selected='true']")
      ?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  // A bare `{` has an empty query and should still list every key, so the
  // dropdown only waits for typing in tag mode.
  const showDropdown = isOpen && (mode === "template" || query.length > 0);

  return (
    <div className="relative">
      <Textarea
        ref={textareaRef}
        id={id}
        rows={rows}
        value={value}
        placeholder={placeholder}
        autoComplete="off"
        spellCheck={false}
        className={cn("resize-y text-sm leading-6", className)}
        onChange={(event) => {
          onChange(event.target.value);
          syncToken(event.target.value, event.target.selectionStart);
        }}
        onKeyDown={handleKeyDown}
        onBlur={onBlur}
        onClick={(event) =>
          syncToken(value, event.currentTarget.selectionStart)
        }
      />

      {showDropdown && (
        <div
          ref={dropdownRef}
          style={{ maxHeight: box.maxHeight }}
          className={cn(
            "bg-popover absolute z-50 w-full overflow-y-auto rounded-md border",
            box.up ? "bottom-full mb-1" : "top-full mt-1"
          )}
          role="listbox"
          aria-label={t("tag.suggestions")}
        >
          {mode === "tag" && isLoading && options.length === 0 && (
            <div className="text-muted-foreground px-3 py-2 text-xs">
              {t("tag.searching")}
            </div>
          )}
          {mode === "tag" && !isLoading && options.length === 0 && (
            <div className="text-muted-foreground px-3 py-2 text-xs">
              {t("tag.noResults")}
            </div>
          )}
          {mode === "template" && options.length === 0 && (
            <div className="text-muted-foreground px-3 py-2 text-xs">
              {t("tag.noTokens")}
            </div>
          )}
          {options.map((option, index) => (
            <button
              key={
                option.kind === "template"
                  ? `t:${option.name}`
                  : `d:${option.tag.name}-${option.tag.categoryId}`
              }
              type="button"
              role="option"
              aria-selected={index === selectedIndex}
              data-selected={index === selectedIndex}
              className={cn(
                "flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-xs transition-colors",
                index === selectedIndex
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-accent/50"
              )}
              onClick={() => handleSelect(option)}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              {option.kind === "template" ? (
                <>
                  <span className="text-primary truncate font-mono font-medium">
                    {`{${option.name}}`}
                  </span>
                  <span className="text-muted-foreground shrink-0 text-[10px]">
                    {t("tag.token")}
                  </span>
                </>
              ) : (
                <>
                  <span className="flex items-center gap-2 overflow-hidden">
                    <span
                      className={cn(
                        "shrink-0 font-medium",
                        CATEGORY_COLORS[option.tag.categoryId] ??
                          "text-foreground"
                      )}
                    >
                      {option.tag.isArtist
                        ? `artist:${option.tag.name}`
                        : option.tag.name}
                    </span>
                    <span className="text-muted-foreground truncate text-[10px]">
                      {CATEGORY_LABELS[option.tag.categoryId] ?? ""}
                    </span>
                  </span>
                  <Badge
                    variant="outline"
                    className="shrink-0 text-[9px] tabular-nums"
                  >
                    {formatCount(option.tag.count)}
                  </Badge>
                </>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
