"use client";

import { Badge } from "@nai-desktop-studio/ui/components/badge";
import { Label } from "@nai-desktop-studio/ui/components/label";
import { cn } from "@nai-desktop-studio/ui/lib/utils";
import { Asterisk, Plus, X } from "lucide-react";
import { useMemo } from "react";

import { TagAutocompleteTextarea } from "@/components/tag-autocomplete/tag-autocomplete-textarea";
import { useT } from "@/i18n/provider";

import {
  createSituationToken,
  DEFAULT_SITUATION_CHARACTER_KEYS,
  extractSituationTokens,
  isInternalSituationKey,
  isManagedSituationKey,
  stripManagedSituationTokens,
  type SituationTarget,
} from "../lib/template";

/**
 * The control on a token chip. A chip is only 18px tall, so the target is grown
 * with padding rather than left at the size of the glyph, and it carries the
 * same focus ring as every other control — a bare icon with no ring is
 * unreachable by keyboard in practice.
 */
function ChipButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className="text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 -mr-0.5 flex size-4.5 items-center justify-center rounded-full transition-colors duration-150 ease-out outline-none focus-visible:ring-1 [&_svg]:size-3"
    >
      {children}
    </button>
  );
}

type Props = {
  target: SituationTarget;
  label: string;
  value: string;
  /** Keys offered while a `{` is open. Every key the app knows about. */
  templateTags: readonly string[];
  onChange: (value: string) => void;
  onBlur: () => void;
  onAddToken: (key: string) => void;
  onRemoveToken: (key: string) => void;
};

/**
 * One situation template field: a text box for the wording, and above it the
 * tokens it holds.
 *
 * The tokens the app inserts on its own — the character presets and the
 * append-only `{additional*}` slots — are kept out of the text box and shown
 * only as chips. They are the same in every situation, so leaving them in the
 * box would bury whatever was actually written for this scene. The presets can
 * be switched off and back on from their chip; the append-only slots cannot,
 * since they are the only way a character reaches a field the situation does not
 * mention.
 */
export function PromptEditorField({
  target,
  label,
  value,
  templateTags,
  onChange,
  onBlur,
  onAddToken,
  onRemoveToken,
}: Props) {
  const t = useT();

  const text = useMemo(
    () => stripManagedSituationTokens(value, target),
    [value, target]
  );
  const present = useMemo(
    () => new Set(extractSituationTokens(value)),
    [value]
  );

  // Every preset stays listed whether it is in the field or not: switching one
  // off drops the character's value for it, so it has to be findable again.
  const presets = useMemo(
    () =>
      target === "characterPrompt"
        ? DEFAULT_SITUATION_CHARACTER_KEYS.map((key) => ({
            key,
            enabled: present.has(key),
          }))
        : [],
    [target, present]
  );

  const ownTokens = useMemo(
    () =>
      extractSituationTokens(value).filter(
        (key) => !isManagedSituationKey(key, target)
      ),
    [value, target]
  );

  const slots = useMemo(
    () =>
      extractSituationTokens(value).filter((key) =>
        isInternalSituationKey(key, target)
      ),
    [value, target]
  );

  return (
    <div className="space-y-2">
      <Label htmlFor={`situation-${target}`}>{label}</Label>

      <div className="flex flex-wrap gap-1.5">
        {presets.map(({ key, enabled }) => {
          const token = createSituationToken(key);
          return (
            <Badge
              key={`preset-${key}`}
              variant={enabled ? "secondary" : "outline"}
              className={cn(
                "gap-1 py-0 pr-0.5 font-mono text-[10px] tracking-normal normal-case",
                !enabled &&
                  "border-dashed text-muted-foreground/70 line-through"
              )}
            >
              <span className="py-0.5">{token}</span>
              <ChipButton
                label={
                  enabled
                    ? t("situations.token.remove", { token })
                    : t("situations.token.restore", { token })
                }
                onClick={() => (enabled ? onRemoveToken(key) : onAddToken(key))}
              >
                {enabled ? <X aria-hidden /> : <Plus aria-hidden />}
              </ChipButton>
            </Badge>
          );
        })}

        {ownTokens.map((key) => {
          const token = createSituationToken(key);
          return (
            <Badge
              key={`own-${key}`}
              variant="secondary"
              className="gap-1 py-0 pr-0.5 font-mono text-[10px] tracking-normal normal-case"
            >
              <span className="py-0.5">{token}</span>
              <ChipButton
                label={t("situations.token.remove", { token })}
                onClick={() => onRemoveToken(key)}
              >
                <X aria-hidden />
              </ChipButton>
            </Badge>
          );
        })}

        {slots.map((key) => (
          <Badge
            key={`slot-${key}`}
            variant="outline"
            className="gap-1 border-dashed font-mono text-[10px] tracking-normal normal-case opacity-70"
            title={t("situations.token.internal")}
          >
            <Asterisk className="size-2.5" aria-hidden />
            <span>{createSituationToken(key)}</span>
          </Badge>
        ))}
      </div>

      {/* A token is added by typing `{key}` into the text, which is also where
          the completion picks it up. The field is already the place tokens
          live, so a separate box for them would be a second way in. */}
      <TagAutocompleteTextarea
        id={`situation-${target}`}
        rows={3}
        value={text}
        onChange={onChange}
        onBlur={onBlur}
        templateTags={templateTags}
        placeholder={t("situations.field.placeholder")}
        className="min-h-20 font-mono text-[11px]"
      />
    </div>
  );
}
