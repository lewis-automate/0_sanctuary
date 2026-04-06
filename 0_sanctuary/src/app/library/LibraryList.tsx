"use client";

import Link from "next/link";
import { useState } from "react";
import { useActivityQueueProcessingTargets } from "@/lib/useActivityQueueProcessingTargets";
import type { LibraryItem, LibrarySortKey } from "../_data/library";
import { sortLibraryItems } from "../_data/library";

const SORT_LABELS: Record<LibrarySortKey, string> = {
  created: "Created",
  times_read: "Times read",
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
  const { progressStoryIds } = useActivityQueueProcessingTargets();
  const [sortKey, setSortKey] = useState<LibrarySortKey>("created");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [unreadOnly, setUnreadOnly] = useState(true);

  const sorted = sortLibraryItems(initialItems, sortKey, sortDirection);
  const items = unreadOnly
    ? sorted.filter((i) => i.read_count === 0)
    : sorted;

  const sortKeys: LibrarySortKey[] = unreadOnly
    ? ["created"]
    : (Object.keys(SORT_LABELS) as LibrarySortKey[]);

  return (
    <>
      <div className="mt-5 flex flex-wrap items-center gap-x-2 gap-y-2">
        {sortKeys.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => {
              if (key === sortKey) {
                setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
              } else {
                setSortKey(key);
                setSortDirection("desc");
              }
            }}
            className={`inline-flex items-center gap-1 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
              key === sortKey
                ? "border-[var(--border-strong)] bg-[var(--nav-active-bg)] text-[var(--nav-active-fg)]"
                : "border-[var(--border-default)] bg-[var(--field-bg)] text-[var(--field-text)] hover:border-[var(--border-strong)]"
            }`}
          >
            <span>{SORT_LABELS[key]}</span>
            {key === sortKey && (
              <span
                className="ml-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-lg bg-[var(--nav-active-fg)]/18 text-base font-bold leading-none text-[var(--nav-active-fg)]"
                aria-hidden
              >
                {sortDirection === "asc" ? "↑" : "↓"}
              </span>
            )}
          </button>
        ))}
      </div>
      <div className="mt-2">
        <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-[var(--foreground)]">
          <input
            type="checkbox"
            checked={unreadOnly}
            onChange={(e) => {
              const checked = e.target.checked;
              setUnreadOnly(checked);
              if (
                checked &&
                (sortKey === "times_read" || sortKey === "rating")
              ) {
                setSortKey("created");
                setSortDirection("desc");
              }
            }}
            className="h-4 w-4 shrink-0 rounded border-[var(--border-strong)] accent-[var(--nav-active-bg)] focus:ring-[var(--nav-active-bg)]"
          />
          Unread only
        </label>
      </div>

      <div className="mt-6 space-y-3">
        {initialItems.length === 0 ? (
          <p className="text-center text-[var(--text-muted)]">No stories yet.</p>
        ) : items.length === 0 ? (
          <p className="text-center text-[var(--text-muted)]">
            No stories match this filter.
          </p>
        ) : (
          items.map((item) => {
            const hasReads = item.read_count > 0;
            const isProgressProcessing = progressStoryIds.has(item.uuid);
            const cardClasses =
              hasReads && !isProgressProcessing
                ? "relative block rounded-3xl border border-[var(--border-strong)] bg-[var(--surface-panel)] p-5 shadow-sm transition-colors hover:bg-[var(--surface-elevated)]"
                : "relative block rounded-3xl border border-[var(--border-default)] bg-[var(--surface-panel)] p-5 transition-colors hover:bg-[var(--surface-elevated)]";

            const titleClasses = "text-base font-semibold text-[var(--foreground)]";

            const metaClasses = "mt-1 flex flex-wrap gap-x-4 gap-y-0 text-sm text-[var(--text-muted)]";

            return (
              <Link
                key={item.uuid}
                href={`/reader?story=${item.uuid}`}
                className={cardClasses}
              >
                {isProgressProcessing ? (
                  <span className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full border border-[var(--border-default)] bg-[var(--field-bg)] px-2 py-0.5 text-[11px] font-medium text-[var(--text-muted)]">
                    <span
                      className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-[var(--text-muted)] opacity-90"
                      aria-hidden
                    />
                    Processing
                  </span>
                ) : hasReads ? (
                  <span className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full border border-[var(--semantic-success-border)] bg-[var(--semantic-success-bg)] px-2 py-0.5 text-[11px] font-medium text-[var(--semantic-success-text)]">
                    <span
                      className="h-1.5 w-1.5 rounded-full bg-[var(--semantic-success-icon)]"
                      aria-hidden
                    />
                    Read
                  </span>
                ) : null}
                <div className={titleClasses}>
                  {item.story_title}
                </div>
                <div className={metaClasses}>
                  <span>Created: {formatDateYMD(item.creation_date)}</span>
                  <span>Difficulty: {item.reading_level || "—"}</span>
                  <span>{item.word_count.toLocaleString()} words</span>
                </div>
                {!unreadOnly && (
                  <div className={metaClasses}>
                    <span>Times read: {item.read_count}</span>
                    <span>
                      Engagement:{" "}
                      {item.fun_grade != null ? item.fun_grade : "—"}
                    </span>
                  </div>
                )}
              </Link>
            );
          })
        )}
      </div>
    </>
  );
}
