"use client";

import Link from "next/link";
import { useState } from "react";
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

function formatDateYMD(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

export function LibraryList({ items: initialItems }: Props) {
  const [sortKey, setSortKey] = useState<LibrarySortKey>("last_read");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const items = sortLibraryItems(initialItems, sortKey, sortDirection);

  return (
    <>
      <div className="mt-5 flex flex-wrap gap-2">
        {(Object.keys(SORT_LABELS) as LibrarySortKey[]).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => {
              if (key === sortKey) {
                setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
              } else {
                setSortKey(key);
                // Sensible defaults per key
                setSortDirection(key === "difficulty" ? "asc" : "desc");
              }
            }}
            className={`inline-flex items-center gap-1 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
              key === sortKey
                ? "border-slate-950 bg-slate-950 text-[#FDFCFB]"
                : "border-slate-200 bg-white/60 text-slate-700 hover:bg-white"
            }`}
          >
            <span>{SORT_LABELS[key]}</span>
            {key === sortKey && (
              <span className="text-xs">
                {sortDirection === "asc" ? "↑" : "↓"}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="mt-6 space-y-3">
        {items.length === 0 ? (
          <p className="text-center text-slate-600">No stories yet.</p>
        ) : (
          items.map((item) => {
            const hasReads = item.read_count > 0;
            const cardClasses = hasReads
              ? "relative block rounded-3xl border border-slate-300 bg-white/90 p-5 shadow-sm transition-colors hover:bg-white"
              : "relative block rounded-3xl border border-slate-200 bg-white/70 p-5 transition-colors hover:bg-white";

            const titleClasses = "text-base font-semibold text-slate-900";

            const metaClasses = "mt-1 flex flex-wrap gap-x-4 gap-y-0 text-sm text-slate-700";

            return (
              <Link
                key={item.uuid}
                href={`/reader?story=${item.uuid}`}
                className={cardClasses}
              >
                {hasReads && (
                  <span className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 border border-emerald-200">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
                    Read
                  </span>
                )}
                <div className={titleClasses}>
                  {item.story_title}
                </div>
                <div className={metaClasses}>
                  <span>Created: {formatDateYMD(item.creation_date)}</span>
                  <span>Difficulty: {item.reading_level || "—"}</span>
                  <span>{item.word_count.toLocaleString()} words</span>
                </div>
                <div className={metaClasses}>
                  <span>Times read: {item.read_count}</span>
                  <span>
                    Engagement:{" "}
                    {item.fun_grade != null ? item.fun_grade : "—"}
                  </span>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </>
  );
}
