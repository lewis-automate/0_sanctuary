"use client";

import {
  BookCheck,
  ChevronDown,
  ChevronUp,
  Copy,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { queueFeedbackReviewed } from "./actions";

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
  const [feedbackItems, setFeedbackItems] = useState<FeedbackItem[]>([]);
  const [feedbackExpandedId, setFeedbackExpandedId] = useState<string | null>(
    null,
  );
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [feedbackPatchError, setFeedbackPatchError] = useState<string | null>(
    null,
  );
  const [patchingFeedbackId, setPatchingFeedbackId] = useState<string | null>(
    null,
  );
  const [copiedId, setCopiedId] = useState<string | null>(null);

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
              ...it,
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

  async function submitFeedbackReviewed(
    id: string,
    reviewed: boolean,
    focus_point: string | null,
  ) {
    setFeedbackPatchError(null);
    setPatchingFeedbackId(id);
    try {
      const result = await queueFeedbackReviewed({
        feedback_id: id,
        reviewed,
        focus_point,
      });
      if (!result.ok) {
        throw new Error(result.error);
      }
      setFeedbackItems((items) =>
        items.map((it) => (it.id === id ? { ...it, reviewed } : it)),
      );
    } catch (e) {
      setFeedbackPatchError(
        e instanceof Error ? e.message : "Could not queue feedback update",
      );
    } finally {
      setPatchingFeedbackId(null);
    }
  }

  return (
    <section aria-label="Feedback" className="space-y-4 text-sm text-slate-700">
      {!hideSectionTitle ? (
        <p className="mb-3 text-center text-xs font-medium uppercase tracking-[0.18em] text-slate-500 sm:text-left">
          Feedback
        </p>
      ) : null}
      <p className="text-xs text-slate-500">
        For now, just copy feedback from below and use your{" "}
        <a
          href="https://gemini.google.com/app"
          target="_blank"
          rel="noreferrer"
          className="underline decoration-slate-300 underline-offset-2 hover:text-slate-700"
        >
          gemini
        </a>{" "}
        gem.
      </p>
      {feedbackLoading && <p className="text-slate-500">Loading feedback…</p>}
      {feedbackError && <p className="text-red-600">{feedbackError}</p>}
      {feedbackPatchError && (
        <p className="text-red-600">{feedbackPatchError}</p>
      )}
      {!feedbackLoading && !feedbackError && feedbackItems.length === 0 && (
        <p className="text-slate-500">No feedback yet.</p>
      )}

      <ul className="divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white/70">
        {feedbackItems.map((item) => {
          const isExpanded = feedbackExpandedId === item.id;
          return (
            <li key={item.id}>
              <div className="flex w-full flex-col gap-2 px-4 py-3 text-left hover:bg-slate-50">
                <p className="min-w-0 font-medium text-slate-900">
                  {item.raw_input}
                </p>

                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/writing/practice/${encodeURIComponent(item.id)}`}
                    className="inline-flex h-8 max-w-full items-center gap-1.5 rounded-full border border-slate-950 bg-slate-950 px-2.5 text-xs font-medium text-[#FDFCFB] transition-colors hover:border-slate-800 hover:bg-slate-800"
                  >
                    <span className="truncate">Practice</span>
                  </Link>
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
                  <button
                    type="button"
                    disabled={patchingFeedbackId === item.id}
                    onClick={() =>
                      submitFeedbackReviewed(
                        item.id,
                        !item.reviewed,
                        item.focus_point,
                      )
                    }
                    title={
                      item.reviewed
                        ? "Undo: mark as not practiced yet"
                        : "Tap when you have practiced this feedback"
                    }
                    className={[
                      "inline-flex h-8 max-w-full items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium transition-colors disabled:opacity-50",
                      item.reviewed
                        ? "border-slate-900 bg-slate-900 text-[#FDFCFB] hover:bg-slate-800"
                        : "border-slate-200 bg-white text-slate-900 hover:border-slate-300 hover:bg-slate-50",
                    ].join(" ")}
                    aria-pressed={item.reviewed}
                  >
                    <BookCheck
                      className="h-3.5 w-3.5 shrink-0"
                      strokeWidth={2}
                      aria-hidden
                    />
                    <span className="truncate">
                      {item.reviewed ? "Practiced" : "Mark as practiced"}
                    </span>
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
