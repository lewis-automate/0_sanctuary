"use client";

import { ChevronDown, ChevronUp, Copy } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { queueFeedbackReviewed } from "./actions";
import { useActivityQueueProcessingTargets } from "@/lib/useActivityQueueProcessingTargets";

type FeedbackItem = {
  id: string;
  raw_input: string;
  alternate_version: string | null;
  feedback: string | null;
  focus_point: string | null;
  reviewed: boolean;
};

type FeedbackSectionProps = {
  /** Hide the uppercase “Feedback” line when the tab bar already shows Feedback. */
  hideSectionTitle?: boolean;
};

export function FeedbackSection({
  hideSectionTitle = false,
}: FeedbackSectionProps) {
  const { feedbackReviewIds } = useActivityQueueProcessingTargets();
  const [feedbackItems, setFeedbackItems] = useState<FeedbackItem[]>([]);
  const [feedbackExpandedId, setFeedbackExpandedId] = useState<string | null>(
    null,
  );
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [unreviewedOnly, setUnreviewedOnly] = useState(true);
  const [toggleErrorId, setToggleErrorId] = useState<string | null>(null);
  const [toggleBusyId, setToggleBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!copiedId) return;
    const id = setTimeout(() => setCopiedId(null), 2200);
    return () => clearTimeout(id);
  }, [copiedId]);

  useEffect(() => {
    let cancelled = false;
    async function loadFeedback() {
      setFeedbackLoading(true);
      setFeedbackError(null);
      try {
        const res = await fetch("/api/feedback-items");
        if (!res.ok) {
          throw new Error("Failed to load feedback");
        }
        const data = (await res.json()) as { items: FeedbackItem[] };
        if (!cancelled) {
          setFeedbackItems(
            (data.items ?? []).map((it) => ({
              id: it.id,
              raw_input: it.raw_input,
              alternate_version: it.alternate_version,
              feedback: it.feedback,
              focus_point: it.focus_point,
              reviewed: !!it.reviewed,
            })),
          );
        }
      } catch (err) {
        if (!cancelled) {
          setFeedbackError(
            err instanceof Error ? err.message : "Unknown error",
          );
        }
      } finally {
        if (!cancelled) {
          setFeedbackLoading(false);
        }
      }
    }
    loadFeedback();
    return () => {
      cancelled = true;
    };
  }, []);

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

  const visibleItems = useMemo(
    () =>
      unreviewedOnly
        ? feedbackItems.filter((i) => !i.reviewed)
        : feedbackItems,
    [feedbackItems, unreviewedOnly],
  );

  useEffect(() => {
    if (
      feedbackExpandedId &&
      !visibleItems.some((i) => i.id === feedbackExpandedId)
    ) {
      setFeedbackExpandedId(null);
    }
  }, [feedbackExpandedId, visibleItems]);

  return (
    <section
      aria-label="Feedback"
      className="space-y-4 text-sm text-[var(--prose-text)]"
    >
      {!hideSectionTitle ? (
        <p className="mb-3 text-center text-xs font-medium uppercase tracking-[0.18em] text-[var(--text-muted)] sm:text-left">
          Feedback
        </p>
      ) : null}

      {feedbackLoading && (
        <p className="text-[var(--text-muted)]">Loading feedback…</p>
      )}
      {feedbackError && <p className="text-[var(--semantic-danger-inline)]">{feedbackError}</p>}
      {!feedbackLoading && !feedbackError && feedbackItems.length === 0 && (
        <p className="text-[var(--text-muted)]">No feedback yet.</p>
      )}

      {!feedbackLoading && !feedbackError && feedbackItems.length > 0 ? (
        <div className="mt-5">
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-[var(--foreground)]">
            <input
              type="checkbox"
              checked={unreviewedOnly}
              onChange={(e) => setUnreviewedOnly(e.target.checked)}
              className="h-4 w-4 shrink-0 rounded border-[var(--border-strong)] accent-[var(--nav-active-bg)] focus:ring-[var(--nav-active-bg)]"
            />
            Unreviewed only
          </label>
        </div>
      ) : null}

      <ul className="mt-6 divide-y divide-[var(--border-default)] rounded-2xl border border-[var(--border-default)] bg-[var(--surface-panel)]">
        {!feedbackLoading &&
        !feedbackError &&
        feedbackItems.length > 0 &&
        visibleItems.length === 0 ? (
          <li className="px-4 py-6 text-center text-[var(--text-muted)]">
            No feedback matches this filter.
          </li>
        ) : null}
        {visibleItems.map((item) => {
          const isExpanded = feedbackExpandedId === item.id;
          const isProcessing = feedbackReviewIds.has(item.id);
          const isToggleBusy = toggleBusyId === item.id;
          const toggleDisabled = isProcessing || isToggleBusy;

          return (
            <li key={item.id}>
              <div className="flex w-full flex-col gap-2 px-4 py-3 text-left hover:bg-[var(--nav-hover-bg)]">
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 flex-1 font-medium text-[var(--foreground)]">
                    {item.raw_input}
                  </p>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    {isProcessing ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-[var(--border-default)] bg-[var(--field-bg)] px-2 py-0.5 text-[11px] font-medium text-[var(--text-muted)]">
                        <span
                          className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-[var(--text-muted)] opacity-90"
                          aria-hidden
                        />
                        Processing
                      </span>
                    ) : null}
                    <label className="inline-flex cursor-pointer items-center gap-1.5 text-[11px] font-medium text-[var(--text-muted)]">
                      <input
                        type="checkbox"
                        checked={item.reviewed}
                        disabled={toggleDisabled}
                        onChange={(e) =>
                          void toggleReviewed(item, e.target.checked)
                        }
                        className="h-3.5 w-3.5 shrink-0 rounded border-[var(--border-strong)] accent-[var(--nav-active-bg)] focus:ring-[var(--nav-active-bg)] disabled:cursor-not-allowed disabled:opacity-50"
                      />
                      Reviewed
                    </label>
                  </div>
                </div>

                {toggleErrorId === item.id ? (
                  <p className="text-[11px] text-[var(--semantic-danger-inline)]">
                    Could not update reviewed status. Try again.
                  </p>
                ) : null}

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setFeedbackExpandedId(isExpanded ? null : item.id)
                    }
                    className="inline-flex h-8 max-w-full items-center gap-1.5 rounded-full border border-[var(--border-default)] bg-[var(--field-bg)] px-2.5 text-xs font-medium text-[var(--field-text)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-elevated)]"
                    aria-expanded={isExpanded}
                  >
                    {isExpanded ? (
                      <ChevronUp
                        className="h-3.5 w-3.5 shrink-0"
                        strokeWidth={2}
                        aria-hidden
                      />
                    ) : (
                      <ChevronDown
                        className="h-3.5 w-3.5 shrink-0"
                        strokeWidth={2}
                        aria-hidden
                      />
                    )}
                    <span className="truncate">
                      {isExpanded ? "Hide" : "Show"}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={async (e) => {
                      e.stopPropagation();
                      const parts = [
                        item.raw_input,
                        item.alternate_version
                          ? `\n\nAlternate version:\n${item.alternate_version}`
                          : "",
                        item.feedback
                          ? `\n\nFeedback:\n${item.feedback}`
                          : "",
                        item.focus_point
                          ? `\n\nFocus point:\n${item.focus_point}`
                          : "",
                      ].filter(Boolean);
                      const text = parts.join("");
                      try {
                        await navigator.clipboard.writeText(text);
                        setCopiedId(item.id);
                      } catch {
                        // ignore copy errors
                      }
                    }}
                    className="inline-flex h-8 max-w-full items-center gap-1.5 rounded-full border border-[var(--border-default)] bg-[var(--field-bg)] px-2.5 text-xs font-medium text-[var(--field-text)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-elevated)]"
                  >
                    <Copy
                      className="h-3.5 w-3.5 shrink-0"
                      strokeWidth={2}
                      aria-hidden
                    />
                    <span className="truncate">Copy</span>
                  </button>
                </div>

                {copiedId === item.id && (
                  <div className="text-[11px] font-medium text-[var(--text-muted)] transition-opacity duration-300">
                    copied
                  </div>
                )}

                {isExpanded && (
                  <div className="mt-2 space-y-1 text-xs text-[var(--text-muted)]">
                    {item.alternate_version && (
                      <p>
                        <span className="font-semibold text-[var(--foreground)]">
                          Alternate version:
                        </span>{" "}
                        {item.alternate_version}
                      </p>
                    )}
                    {item.feedback && (
                      <p>
                        <span className="font-semibold text-[var(--foreground)]">
                          Feedback:
                        </span>{" "}
                        {item.feedback}
                      </p>
                    )}
                    {item.focus_point && (
                      <p>
                        <span className="font-semibold text-[var(--foreground)]">
                          Focus point:
                        </span>{" "}
                        {item.focus_point}
                      </p>
                    )}
                    <div className="pt-2">
                      <Link
                        href={`/writing/practice/${encodeURIComponent(item.id)}`}
                        className="flex w-full items-center justify-center rounded-2xl border border-[var(--border-strong)] bg-[var(--nav-active-bg)] py-3 text-center text-sm font-medium leading-snug text-[var(--nav-active-fg)] transition-colors hover:opacity-90"
                      >
                        Start a review session with tutor
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
