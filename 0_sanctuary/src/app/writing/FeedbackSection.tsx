"use client";

import { Check, ChevronDown, Copy } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { queueFeedbackReviewed } from "../vocab/actions";
import type { FeedbackListItem } from "@/lib/load-feedback-items";
import { useActivityQueueProcessingTargets } from "@/lib/useActivityQueueProcessingTargets";

export type FeedbackItem = FeedbackListItem;

type Props = {
  initialItems?: FeedbackItem[];
};

function buildCopyText(item: FeedbackItem): string {
  const parts = [
    item.raw_input,
    item.alternate_version
      ? `\n\nSuggested version:\n${item.alternate_version}`
      : "",
    item.feedback ? `\n\nFeedback:\n${item.feedback}` : "",
    item.focus_point ? `\n\nFocus for next time:\n${item.focus_point}` : "",
  ].filter(Boolean);
  return parts.join("");
}

type FilterMode = "unreviewed" | "all";

function FeedbackBlock({
  label,
  children,
  variant = "default",
}: {
  label: string;
  children: string;
  variant?: "default" | "emphasis" | "callout";
}) {
  const base =
    variant === "callout"
      ? "rounded-xl border border-[var(--semantic-success-border)] bg-[var(--semantic-success-bg)] px-3 py-2.5"
      : variant === "emphasis"
        ? "rounded-xl border border-[var(--border-default)] bg-[var(--field-bg)] px-3 py-2.5"
        : "rounded-xl border border-[var(--border-default)]/70 bg-[var(--surface-elevated)]/60 px-3 py-2.5";

  return (
    <div>
      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
        {label}
      </p>
      <div
        className={`whitespace-pre-wrap text-sm leading-relaxed text-[var(--foreground)] ${base}`}
      >
        {children}
      </div>
    </div>
  );
}

export function FeedbackSection({ initialItems }: Props) {
  const { feedbackReviewIds } = useActivityQueueProcessingTargets();
  const [feedbackItems, setFeedbackItems] = useState<FeedbackItem[]>(
    () => initialItems ?? [],
  );
  const [expandedId, setExpandedId] = useState<string | null>(() => {
    const first = (initialItems ?? []).find((i) => !i.reviewed);
    return first?.id ?? null;
  });
  const [loading, setLoading] = useState(initialItems === undefined);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterMode>("unreviewed");
  const [toggleErrorId, setToggleErrorId] = useState<string | null>(null);
  const [toggleBusyId, setToggleBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!copiedId) return;
    const id = setTimeout(() => setCopiedId(null), 2200);
    return () => clearTimeout(id);
  }, [copiedId]);

  useEffect(() => {
    if (initialItems) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    async function loadFeedback() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/feedback-items");
        if (!res.ok) {
          throw new Error("Failed to load feedback");
        }
        const data = (await res.json()) as { items: FeedbackItem[] };
        if (!cancelled) {
          const items = (data.items ?? []).map((it) => ({
            id: it.id,
            raw_input: it.raw_input,
            alternate_version: it.alternate_version,
            feedback: it.feedback,
            focus_point: it.focus_point,
            reviewed: !!it.reviewed,
          }));
          setFeedbackItems(items);
          const firstUnreviewed = items.find((i) => !i.reviewed);
          if (firstUnreviewed) {
            setExpandedId(firstUnreviewed.id);
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unknown error");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    void loadFeedback();
    return () => {
      cancelled = true;
    };
  }, [initialItems]);

  const toggleReviewed = useCallback(
    async (item: FeedbackItem, nextReviewed: boolean) => {
      if (feedbackReviewIds.has(item.id) || toggleBusyId === item.id) return;

      setToggleErrorId(null);
      setToggleBusyId(item.id);
      const previous = item.reviewed;
      setFeedbackItems((prev) =>
        prev.map((i) =>
          i.id === item.id ? { ...i, reviewed: nextReviewed } : i,
        ),
      );

      const result = await queueFeedbackReviewed({
        feedback_id: item.id,
        reviewed: nextReviewed,
        focus_point: item.focus_point,
      });

      setToggleBusyId(null);
      if (!result.ok) {
        setFeedbackItems((prev) =>
          prev.map((i) =>
            i.id === item.id ? { ...i, reviewed: previous } : i,
          ),
        );
        setToggleErrorId(item.id);
      }
    },
    [feedbackReviewIds, toggleBusyId],
  );

  const unreviewedCount = useMemo(
    () => feedbackItems.filter((i) => !i.reviewed).length,
    [feedbackItems],
  );

  const visibleItems = useMemo(
    () =>
      filter === "unreviewed"
        ? feedbackItems.filter((i) => !i.reviewed)
        : feedbackItems,
    [feedbackItems, filter],
  );

  useEffect(() => {
    if (expandedId && !visibleItems.some((i) => i.id === expandedId)) {
      setExpandedId(visibleItems[0]?.id ?? null);
    }
  }, [expandedId, visibleItems]);

  const filterBtn = (mode: FilterMode, label: string) => {
    const active = filter === mode;
    return (
      <button
        type="button"
        onClick={() => setFilter(mode)}
        aria-pressed={active}
        className={[
          "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
          active
            ? "border border-[var(--border-strong)] bg-[var(--nav-active-bg)] text-[var(--nav-active-fg)]"
            : "border border-[var(--border-default)] bg-[var(--field-bg)] text-[var(--field-text)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-elevated)]",
        ].join(" ")}
      >
        {label}
      </button>
    );
  };

  return (
    <section aria-label="Writing feedback" className="space-y-4">
      {loading ? (
        <p className="text-sm text-[var(--text-muted)]">Loading feedback…</p>
      ) : null}
      {error ? (
        <p className="text-sm text-[var(--semantic-danger-inline)]">{error}</p>
      ) : null}

      {!loading && !error && feedbackItems.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--border-default)] bg-[var(--surface-panel)] px-4 py-10 text-center">
          <p className="text-sm font-medium text-[var(--foreground)]">
            No feedback yet
          </p>
          <p className="mt-2 text-sm leading-relaxed text-[var(--text-muted)]">
            Submit a piece from Write now and feedback will show up here.
          </p>
        </div>
      ) : null}

      {!loading && !error && feedbackItems.length > 0 ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-[var(--text-muted)]">
              {unreviewedCount === 0
                ? "You're all caught up."
                : `${unreviewedCount} ${unreviewedCount === 1 ? "piece" : "pieces"} to review`}
            </p>
            <div className="flex flex-wrap gap-2">
              {filterBtn("unreviewed", `To review (${unreviewedCount})`)}
              {filterBtn("all", `All (${feedbackItems.length})`)}
            </div>
          </div>

          {visibleItems.length === 0 ? (
            <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-panel)] px-4 py-8 text-center">
              <p className="text-sm text-[var(--text-muted)]">
                Nothing left to review. Switch to All to browse past feedback.
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {visibleItems.map((item) => {
                const isExpanded = expandedId === item.id;
                const isProcessing = feedbackReviewIds.has(item.id);
                const isToggleBusy = toggleBusyId === item.id;
                const toggleDisabled = isProcessing || isToggleBusy;

                return (
                  <li key={item.id}>
                    <article
                      className={[
                        "overflow-hidden rounded-2xl border shadow-sm transition-colors",
                        item.reviewed
                          ? "border-[var(--border-default)] bg-[var(--surface-panel)]"
                          : "border-[var(--border-strong)] bg-[var(--surface-panel)]",
                      ].join(" ")}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedId(isExpanded ? null : item.id)
                        }
                        aria-expanded={isExpanded}
                        className="flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-[var(--nav-hover-bg)]"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            {!item.reviewed ? (
                              <span className="inline-flex shrink-0 rounded-full border border-[var(--border-strong)] bg-[var(--nav-active-bg)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--nav-active-fg)]">
                                New
                              </span>
                            ) : (
                              <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[var(--semantic-success-border)] bg-[var(--semantic-success-bg)] px-2 py-0.5 text-[10px] font-semibold text-[var(--semantic-success-text)]">
                                <Check
                                  className="h-3 w-3 shrink-0"
                                  strokeWidth={2.5}
                                  aria-hidden
                                />
                                Reviewed
                              </span>
                            )}
                            {isProcessing ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[var(--text-muted)]">
                                <span
                                  className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--text-muted)]"
                                  aria-hidden
                                />
                                Saving…
                              </span>
                            ) : null}
                          </div>
                          <p
                            className={`mt-2 text-sm leading-relaxed text-[var(--foreground)] ${
                              isExpanded ? "" : "line-clamp-2"
                            }`}
                          >
                            {item.raw_input}
                          </p>
                          {!isExpanded && item.focus_point?.trim() ? (
                            <p className="mt-1.5 line-clamp-1 text-xs text-[var(--text-muted)]">
                              Focus: {item.focus_point}
                            </p>
                          ) : null}
                        </div>
                        <ChevronDown
                          className={`mt-1 h-4 w-4 shrink-0 text-[var(--text-muted)] transition-transform ${
                            isExpanded ? "rotate-180" : ""
                          }`}
                          strokeWidth={2}
                          aria-hidden
                        />
                      </button>

                      {isExpanded ? (
                        <div className="space-y-4 border-t border-[var(--border-default)] px-4 py-4">
                          <FeedbackBlock label="Your writing">
                            {item.raw_input}
                          </FeedbackBlock>

                          {item.alternate_version?.trim() ? (
                            <FeedbackBlock
                              label="Suggested version"
                              variant="emphasis"
                            >
                              {item.alternate_version}
                            </FeedbackBlock>
                          ) : null}

                          {item.feedback?.trim() ? (
                            <FeedbackBlock label="Feedback">
                              {item.feedback}
                            </FeedbackBlock>
                          ) : null}

                          {item.focus_point?.trim() ? (
                            <FeedbackBlock label="Focus for next time" variant="callout">
                              {item.focus_point}
                            </FeedbackBlock>
                          ) : null}

                          {toggleErrorId === item.id ? (
                            <p className="text-xs text-[var(--semantic-danger-inline)]">
                              Could not update reviewed status. Try again.
                            </p>
                          ) : null}

                          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border-default)]/80 pt-3">
                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  await navigator.clipboard.writeText(
                                    buildCopyText(item),
                                  );
                                  setCopiedId(item.id);
                                } catch {
                                  // ignore
                                }
                              }}
                              className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[var(--border-default)] bg-[var(--field-bg)] px-3 text-xs font-medium text-[var(--field-text)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-elevated)]"
                            >
                              <Copy
                                className="h-3.5 w-3.5 shrink-0"
                                strokeWidth={2}
                                aria-hidden
                              />
                              {copiedId === item.id ? "Copied" : "Copy all"}
                            </button>

                            <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-[var(--foreground)]">
                              <input
                                type="checkbox"
                                checked={item.reviewed}
                                disabled={toggleDisabled}
                                onChange={(e) =>
                                  void toggleReviewed(item, e.target.checked)
                                }
                                className="h-4 w-4 shrink-0 rounded border-[var(--border-strong)] accent-[var(--nav-active-bg)] focus:ring-[var(--nav-active-bg)] disabled:cursor-not-allowed disabled:opacity-50"
                              />
                              Mark reviewed
                            </label>
                          </div>
                        </div>
                      ) : null}
                    </article>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      ) : null}
    </section>
  );
}
