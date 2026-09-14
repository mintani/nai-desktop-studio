"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@nai-desktop-studio/ui/components/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@nai-desktop-studio/ui/components/collapsible";
import { ScrollArea } from "@nai-desktop-studio/ui/components/scroll-area";
import { cn } from "@nai-desktop-studio/ui/lib/utils";
import { ChevronDown, ExternalLink, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

import { SegmentedControl } from "@/components/segmented-control";
import { resolveThumbSrc } from "@/features/generate/lib/image-actions";
import type { GeneratedImage } from "@/features/generate/types/image";
import { useT } from "@/i18n/provider";

import { useAnalysisModels, useArtistAnalysis } from "../hooks/queries";
import type { ArtistResult } from "../lib/api";
import { ArtistLookupField } from "./artist-lookup-field";
import { ModelStatusRow } from "./model-status-row";

/**
 * Where "a small artist" starts, in Danbooru posts. Most of the artist
 * model's 39k names sit under a hundred posts; a name past this many is one
 * that has a recognisable body of work to have drifted towards.
 */
const MAJOR_ARTIST_MIN_POSTS = 200;

type ArtistScope = "major" | "all" | "prompt";
const SCOPE_STORAGE_KEY = "nai-analysis-artist-scope";

/** The artist's posts on Danbooru, where the tag comes from. */
function danbooruUrl(name: string) {
  return `https://danbooru.donmai.us/posts?tags=${encodeURIComponent(name)}`;
}

function DanbooruLink({ name }: { name: string }) {
  const t = useT();
  return (
    <a
      href={danbooruUrl(name)}
      target="_blank"
      rel="noreferrer"
      title={t("analysis.artist.openDanbooru")}
      aria-label={t("analysis.artist.openDanbooru")}
      className="text-muted-foreground hover:text-foreground shrink-0 transition-colors"
    >
      <ExternalLink className="size-3" aria-hidden />
    </a>
  );
}

function formatPosts(count: number) {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(0)}k`;
  return String(count);
}

function percent(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

function messageOf(error: unknown) {
  return error instanceof Error ? error.message : null;
}

/**
 * One model's answer: its best candidates against the top score, and what
 * the numbers mean.
 */
function ArtistResultBlock({
  result,
  scope,
}: {
  result: ArtistResult;
  scope: ArtistScope;
}) {
  const t = useT();
  // The bars are relative to the best candidate the model gave, whichever
  // scope is on, so narrowing the list does not stretch the survivors.
  const topScore = result.candidates[0]?.score ?? 0;
  // Every row carries its place in the full ranking: the candidates are the
  // head of it, the prompt's artists can sit anywhere in it.
  const shown =
    scope === "prompt"
      ? result.mentioned
      : result.candidates
          .map((candidate, index) => ({ ...candidate, rank: index + 1 }))
          .filter(
            (candidate) =>
              scope === "all" ||
              (candidate.posts !== null &&
                candidate.posts >= MAJOR_ARTIST_MIN_POSTS)
          );

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs font-medium">{result.label}</span>
        <span className="text-muted-foreground font-mono text-[0.625rem] tabular-nums">
          {t("analysis.artist.knows", {
            count: result.artists.toLocaleString(),
          })}
        </span>
      </div>
      {shown.length === 0 && (
        <p className="text-muted-foreground text-[0.625rem] leading-tight">
          {scope === "prompt"
            ? t("analysis.artist.nonePrompt")
            : t("analysis.artist.noneMajor", {
                total: result.candidates.length,
                count: MAJOR_ARTIST_MIN_POSTS,
              })}
        </p>
      )}
      {/* Eight rows tall whatever the scope holds; the rest scrolls inside
          it, so the block below never moves when the list grows. */}
      <ScrollArea className="max-h-40">
        <ul className="space-y-1 pr-3">
          {shown.map((candidate) => (
            <li key={candidate.name} className="flex items-center gap-2">
              <span className="text-muted-foreground w-8 shrink-0 font-mono text-[0.625rem] tabular-nums">
                {candidate.rank}
              </span>
              <span
                className="min-w-0 flex-[1.4] truncate font-mono text-[0.6875rem]"
                title={candidate.name}
              >
                {candidate.name}
              </span>
              <span className="text-muted-foreground w-7 shrink-0 text-right font-mono text-[0.625rem] tabular-nums">
                {candidate.posts === null ? "–" : formatPosts(candidate.posts)}
              </span>
              <span className="bg-muted rounded-pill h-1.5 min-w-0 flex-1 overflow-hidden">
                <span
                  className="bg-primary/60 rounded-pill block h-full"
                  style={{
                    width:
                      topScore > 0
                        ? `${(candidate.score / topScore) * 100}%`
                        : "0%",
                  }}
                />
              </span>
              <span className="w-11 shrink-0 text-right font-mono text-[0.625rem] tabular-nums">
                {percent(candidate.score)}
              </span>
              <DanbooruLink name={candidate.name} />
            </li>
          ))}
        </ul>
      </ScrollArea>
      <p className="text-muted-foreground text-[0.625rem] leading-tight">
        {t("analysis.artist.caption")}
      </p>
    </div>
  );
}

type Props = {
  image: GeneratedImage | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/**
 * One question about one finished image: whose style is it close to.
 *
 * The model is fetched on demand, so the section can open on its download
 * row rather than its results.
 */
export function AnalysisDialog({ image, open, onOpenChange }: Props) {
  const t = useT();
  const imageId = image?.id ?? null;
  const { artistModels, isPending } = useAnalysisModels();
  const readyArtistModels = artistModels
    .filter((model) => model.ready)
    .map((model) => model.id);

  const [lookupArtist, setLookupArtist] = useState("");
  const [lookupOpen, setLookupOpen] = useState(false);
  const [scope, setScope] = useState<ArtistScope>("major");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(SCOPE_STORAGE_KEY);
      if (saved === "all" || saved === "prompt") setScope(saved);
    } catch {
      // ignore disabled storage
    }
  }, []);

  function changeScope(next: ArtistScope) {
    setScope(next);
    try {
      localStorage.setItem(SCOPE_STORAGE_KEY, next);
    } catch {
      // ignore quota / disabled storage
    }
  }
  // A new image is a new question: the old tag would answer for the picture
  // that is no longer on screen.
  useEffect(() => {
    setLookupArtist("");
    setLookupOpen(false);
  }, [imageId]);

  const artists = useArtistAnalysis(
    imageId,
    lookupArtist,
    readyArtistModels,
    open
  );
  const analysis = artists.data;
  const lookup = analysis?.results[0]?.lookup ?? null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-3xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle>{t("analysis.title")}</DialogTitle>
            {isPending && (
              <Loader2
                className="text-muted-foreground size-3.5 animate-spin"
                aria-hidden
              />
            )}
          </div>
          <DialogDescription>{t("analysis.description")}</DialogDescription>
        </DialogHeader>

        {image && (
          <ScrollArea className="-mx-1 min-h-0 flex-1">
            <div className="grid gap-4 px-1 sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)]">
              <div className="bg-muted flex items-start justify-center rounded-md p-2">
                <img
                  src={resolveThumbSrc(image)}
                  alt=""
                  decoding="async"
                  className="max-h-64 max-w-full rounded object-contain"
                />
              </div>

              <div className="min-w-0 space-y-5">
                <section className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-muted-foreground text-[0.6875rem] font-medium">
                      {t("analysis.section.artist")}
                    </h4>
                    {readyArtistModels.length > 0 && (
                      <SegmentedControl
                        label={t("analysis.artist.scope")}
                        value={scope}
                        options={[
                          {
                            value: "major",
                            label: t("analysis.artist.scope.major", {
                              count: MAJOR_ARTIST_MIN_POSTS,
                            }),
                          },
                          {
                            value: "all",
                            label: t("analysis.artist.scope.all"),
                          },
                          {
                            value: "prompt",
                            label: t("analysis.artist.scope.prompt"),
                          },
                        ]}
                        onChange={changeScope}
                        className="w-72"
                      />
                    )}
                  </div>

                  {artistModels
                    .filter((model) => !model.ready)
                    .map((model) => (
                      <ModelStatusRow key={model.id} model={model} />
                    ))}

                  {readyArtistModels.length > 0 && (
                    <div className="space-y-3">
                      {artists.isPending && (
                        <p className="text-muted-foreground flex items-center gap-2 text-xs">
                          <Loader2
                            className="size-3.5 animate-spin"
                            aria-hidden
                          />
                          {t("analysis.analyzing")}
                        </p>
                      )}

                      {artists.isError && (
                        <p className="text-destructive text-xs leading-tight">
                          {messageOf(artists.error)}
                        </p>
                      )}

                      {analysis?.results.map((result) => (
                        <ArtistResultBlock
                          key={result.model}
                          result={result}
                          scope={scope}
                        />
                      ))}

                      {/* Folded until asked for: most runs only want the list.
                        Kept mounted while open — a committed tag starts a new
                        request, and the field must not vanish under it. */}
                      <Collapsible
                        open={lookupOpen}
                        onOpenChange={setLookupOpen}
                      >
                        <CollapsibleTrigger className="font-display flex w-full items-center justify-between py-1 text-left text-[0.6875rem] font-medium">
                          {t("analysis.artist.lookupLabel")}
                          <ChevronDown
                            className={cn(
                              "text-muted-foreground size-3.5 transition-transform duration-150 ease-out",
                              lookupOpen && "rotate-180"
                            )}
                            aria-hidden
                          />
                        </CollapsibleTrigger>
                        <CollapsibleContent className="space-y-1.5 pt-1">
                          <ArtistLookupField
                            key={image.id}
                            value={lookupArtist}
                            onChange={setLookupArtist}
                          />
                          {lookup ? (
                            <p className="flex items-center gap-2 font-mono text-xs tabular-nums">
                              {t("analysis.artist.lookupResult", {
                                rank: lookup.rank,
                                score: (lookup.score * 100).toFixed(1),
                              })}
                              <DanbooruLink name={lookup.name} />
                            </p>
                          ) : (
                            analysis &&
                            lookupArtist.length > 0 && (
                              <p className="text-muted-foreground text-[0.625rem] leading-tight">
                                {t("analysis.artist.notInModel")}
                              </p>
                            )
                          )}
                        </CollapsibleContent>
                      </Collapsible>
                    </div>
                  )}
                </section>
              </div>
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
