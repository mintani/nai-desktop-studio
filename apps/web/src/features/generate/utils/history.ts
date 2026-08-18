import type { GeneratedImage } from "@/features/generate/types/image";
import type { Locale } from "@/i18n/locale";

export type HistoryGroup = {
  batchId: string;
  createdAt: string;
  images: GeneratedImage[];
};

/**
 * Groups history images by batch (images produced by the same "generate").
 * Groups are ordered newest-first, and within a group by ascending index
 * (ordering by index rather than createdAt because index is the sequence that
 * guarantees the display order within a batch).
 */
export function groupHistoryByBatch(images: GeneratedImage[]): HistoryGroup[] {
  const groups = new Map<
    string,
    { images: GeneratedImage[]; createdAt: string }
  >();
  for (const img of images) {
    const existing = groups.get(img.batchId);
    if (existing) {
      existing.images.push(img);
    } else {
      groups.set(img.batchId, { images: [img], createdAt: img.createdAt });
    }
  }
  return Array.from(groups.entries())
    .map(([batchId, data]) => ({
      batchId,
      createdAt: data.createdAt,
      images: [...data.images].sort((a, b) => a.index - b.index),
    }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function formatBatchTime(iso: string, locale: Locale): string {
  const d = new Date(iso);
  const now = new Date();
  const time = d.toLocaleTimeString(locale, {
    hour: "2-digit",
    minute: "2-digit",
  });
  if (d.toDateString() === now.toDateString()) return time;
  const date = d.toLocaleDateString(locale, {
    month: "2-digit",
    day: "2-digit",
  });
  return `${date} ${time}`;
}
