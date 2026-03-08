"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowUpDown } from "lucide-react";
import type { LibraryItem, LibrarySortKey } from "../_data/library";
import { sortLibraryItems } from "../_data/library";

const SORT_LABELS: Record<LibrarySortKey, string> = {
  last_read: "Last read",
  difficulty: "Difficulty",
  rating: "Rating",
};

type Props = {
  items: LibraryItem[];
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function LibraryList({ items: initialItems }: Props) {
  const [sortKey, setSortKey] = useState<LibrarySortKey>("last_read");
  const items = sortLibraryItems(initialItems, sortKey);

  return (
    <>
      <div className="mt-5 flex flex-wrap gap-2">
        {(Object.keys(SORT_LABELS) as LibrarySortKey[]).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setSortKey(key)}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/60 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-white"
          >
            {SORT_LABELS[key]}
            <ArrowUpDown className="h-4 w-4 text-slate-500" />
          </button>
        ))}
      </div>

      <div className="mt-6 space-y-3">
        {items.length === 0 ? (
          <p className="text-center text-slate-600">No stories yet.</p>
        ) : (
          items.map((item) => (
            <Link
              key={item.uuid}
              href={`/reader?story=${item.uuid}`}
              className="block rounded-3xl border border-slate-200 bg-white/70 p-5 transition-colors hover:bg-white"
            >
              <div className="text-base font-semibold text-slate-900">
                {item.story_title}
              </div>
              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0 text-sm text-slate-600">
                <span>{item.word_count.toLocaleString()} words</span>
                <span>{item.reading_level || "—"}</span>
                <span>Created {formatDate(item.creation_date)}</span>
                {item.reading_date != null && (
                  <span>Read {formatDate(item.reading_date)}</span>
                )}
                {item.fun_grade != null && (
                  <span>Rating {item.fun_grade}</span>
                )}
              </div>
            </Link>
          ))
        )}
      </div>
    </>
  );
}
