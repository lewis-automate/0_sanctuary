"use client";

import { ChevronDown, ChevronUp, Copy } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type FeedbackItem = {
  id: string;
  raw_input: string;
  alternate_version: string | null;
  feedback: string | null;
  focus_point: string | null;
  /** Set server-side when a review session is completed (not toggled from this UI). */
  reviewed: boolean;
};

type FeedbackSectionProps = {
  /** Hide the uppercase “Feedback” line when the tab bar already shows Feedback. */
  hideSectionTitle?: boolean;
};

export function FeedbackSection({
  hideSectionTitle = false,
}: FeedbackSectionProps) {
  const [feedbackItems, setFeedbackItems] = useState<FeedbackItem[]>([]);
  const [feedbackExpandedId, setFeedbackExpandedId] = useState<string | null>(
    null,
  );
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [unreviewedOnly, setUnreviewedOnly] = useState(true);

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
    <section aria-label="Feedback" className="space-y-4 text-sm text-slate-700">
      {!hideSectionTitle ? (
        <p className="mb-3 text-center text-xs font-medium uppercase tracking-[0.18em] text-slate-500 sm:text-left">
          Feedback
        </p>
      ) : null}

      {feedbackLoading && <p className="text-slate-500">Loading feedback…</p>}
      {feedbackError && <p className="text-red-600">{feedbackError}</p>}
      {!feedbackLoading && !feedbackError && feedbackItems.length === 0 && (
        <p className="text-slate-500">No feedback yet.</p>
      )}

      {!feedbackLoading && !feedbackError && feedbackItems.length > 0 ? (
        <div className="mt-5">
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              checked={unreviewedOnly}
              onChange={(e) => setUnreviewedOnly(e.target.checked)}
              className="h-4 w-4 shrink-0 rounded border-slate-300 accent-slate-950 focus:ring-slate-950"
            />
            Unreviewed only
          </label>
        </div>
      ) : null}

      <ul className="mt-6 divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white/70">
        {!feedbackLoading &&
        !feedbackError &&
        feedbackItems.length > 0 &&
        visibleItems.length === 0 ? (
          <li className="px-4 py-6 text-center text-slate-500">
            No feedback matches this filter.
          </li>
        ) : null}
        {visibleItems.map((item) => {
          const isExpanded = feedbackExpandedId === item.id;
          return (
            <li key={item.id}>
              <div className="flex w-full flex-col gap-2 px-4 py-3 text-left hover:bg-slate-50">
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 flex-1 font-medium text-slate-900">
                    {item.raw_input}
                  </p>
                  {item.reviewed ? (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                      <span
                        className="h-1.5 w-1.5 rounded-full bg-emerald-500"
                        aria-hidden
                      />
                      Reviewed
                    </span>
                  ) : null}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setFeedbackExpandedId(isExpanded ? null : item.id)
                    }
                    className="inline-flex h-8 max-w-full items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-900 transition-colors hover:border-slate-300 hover:bg-slate-50"
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
                    className="inline-flex h-8 max-w-full items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-900 transition-colors hover:border-slate-300 hover:bg-slate-50"
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
                  <div className="text-[11px] font-medium text-slate-500 transition-opacity duration-300">
                    copied
                  </div>
                )}

                {isExpanded && (
                  <div className="mt-2 space-y-1 text-xs text-slate-600">
                    {item.alternate_version && (
                      <p>
                        <span className="font-semibold text-slate-700">
                          Alternate version:
                        </span>{" "}
                        {item.alternate_version}
                      </p>
                    )}
                    {item.feedback && (
                      <p>
                        <span className="font-semibold text-slate-700">
                          Feedback:
                        </span>{" "}
                        {item.feedback}
                      </p>
                    )}
                    {item.focus_point && (
                      <p>
                        <span className="font-semibold text-slate-700">
                          Focus point:
                        </span>{" "}
                        {item.focus_point}
                      </p>
                    )}
                    <div className="pt-2">
                      <Link
                        href={`/writing/practice/${encodeURIComponent(item.id)}`}
                        className="flex w-full items-center justify-center rounded-2xl bg-slate-900 py-3 text-center text-sm font-medium leading-snug text-[#FDFCFB] transition-colors hover:bg-slate-800"
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
