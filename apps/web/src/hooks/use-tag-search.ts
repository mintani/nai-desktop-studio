import { env } from "@nai-desktop-studio/env/web";
import { useEffect, useRef, useState } from "react";

export interface TagResult {
  name: string;
  categoryId: number;
  count: number;
  isArtist: boolean;
  displayName: string;
}

interface TagSearchResult {
  query: string;
  results: TagResult[];
  total: number;
}

export function useTagSearch(query: string, limit = 20) {
  const [results, setResults] = useState<TagResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    if (!query || query.trim().length === 0) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    timerRef.current = setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const params = new URLSearchParams({
          q: query.trim(),
          limit: String(limit),
        });
        const response = await fetch(
          `${env.VITE_SERVER_URL}/tags/search?${params}`,
          { signal: controller.signal }
        );

        if (!response.ok) throw new Error("Failed to search tags");

        const data = (await response.json()) as TagSearchResult;
        if (!controller.signal.aborted) {
          setResults(data.results);
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError")
          return;
        if (!controller.signal.aborted) {
          setResults([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }, 150);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      abortRef.current?.abort();
    };
  }, [query, limit]);

  return { results, isLoading };
}
