"use client";

import {
  BookCheck,
  ChevronDown,
  ChevronUp,
  Copy,
} from "lucide-react";
import { useEffect, useState } from "react";
import { queueFeedbackReviewed } from "./actions";

type StudyItem = {
  id: string;
  vocab: string;
  example_sentences: string | null;
  definition: string | null;
  translation: string | null;
};

type FeedbackItem = {
  id: string;
  raw_input: string;
  alternate_version: string | null;
  feedback: string | null;
  focus_point: string | null;
  reviewed: boolean;
};

const tabs = [
  { id: "vocab", label: "Vocab" },
  { id: "bites", label: "Bites" },
  { id: "feedback", label: "Feedback" },
] as const;

type TabId = (typeof tabs)[number]["id"];

export function VocabReview() {
  const [activeTab, setActiveTab] = useState<TabId>("vocab");
  const [items, setItems] = useState<StudyItem[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
  const [exportingCsv, setExportingCsv] = useState(false);
  const [exportCsvError, setExportCsvError] = useState<string | null>(null);

  useEffect(() => {
    if (!copiedId) return;
    const id = setTimeout(() => setCopiedId(null), 2200);
    return () => clearTimeout(id);
  }, [copiedId]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/study-items");
        if (!res.ok) {
          throw new Error("Failed to load vocab");
        }
        const data = (await res.json()) as { items: StudyItem[] };
        if (!cancelled) {
          setItems(data.items ?? []);
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
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (activeTab !== "feedback" || feedbackItems.length > 0) return;
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
  }, [activeTab, feedbackItems.length]);

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

  async function downloadStudyItemsCsv() {
    setExportCsvError(null);
    setExportingCsv(true);
    try {
      const res = await fetch("/api/study-items/export");
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(json.error ?? "Export failed");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `vocab-export-${new Date().toISOString().slice(0, 10)}.csv`;
      a.rel = "noopener";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setExportCsvError(
        e instanceof Error ? e.message : "Could not export CSV",
      );
    } finally {
      setExportingCsv(false);
    }
  }

  return (
    <>
      <p className="mb-3 text-center text-xs font-medium uppercase tracking-[0.18em] text-slate-500 sm:text-left">
        Review
      </p>

      <div className="sticky top-0 z-40 -mx-6 mb-6 border-b border-slate-200 bg-[#FDFCFB]/95 px-6 pt-1 backdrop-blur">
        <nav
          aria-label="Review sections"
          className="flex gap-2 py-2 text-sm font-medium text-slate-600"
        >
          {tabs.map((tab) => {
            const isActive = tab.id === activeTab;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={[
                  "flex-1 rounded-full px-3 py-2 transition-colors",
                  isActive
                    ? "bg-slate-950 text-[#FDFCFB]"
                    : "bg-transparent text-slate-700 hover:bg-slate-900/5 hover:text-slate-900",
                ].join(" ")}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="min-h-[50vh] py-8">
        {activeTab === "vocab" && (
          <section aria-label="Vocab" className="space-y-4 text-sm text-slate-700">
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
              <p className="text-xs text-slate-500">
                Coming soon: archive buttons and the option to save words in
                isolation (they are automatically chunked into pairs by default).
              </p>
              <button
                type="button"
                onClick={downloadStudyItemsCsv}
                disabled={exportingCsv}
                className="inline-flex shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-900 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {exportingCsv ? "Exporting…" : "Export to CSV"}
              </button>
            </div>
            {exportCsvError && (
              <p className="text-sm text-red-600">{exportCsvError}</p>
            )}
            {loading && <p className="text-slate-500">Loading vocab…</p>}
            {error && <p className="text-red-600">{error}</p>}
            {!loading && !error && items.length === 0 && (
              <p className="text-slate-500">No vocab saved yet.</p>
            )}

            <ul className="divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white/70">
              {items.map((item) => {
                const isExpanded = expandedId === item.id;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => setExpandedId(isExpanded ? null : item.id)}
                      className="flex w-full flex-col gap-1 px-4 py-3 text-left hover:bg-slate-50"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <p className="font-medium text-slate-900">{item.vocab}</p>
                          {item.example_sentences && (
                            <p className="mt-1 line-clamp-2 text-xs text-slate-600">
                              {item.example_sentences}
                            </p>
                          )}
                        </div>
                        <span className="mt-1 text-xs text-slate-400">
                          {isExpanded ? "Hide" : "Show"}
                        </span>
                      </div>

                      {isExpanded && (
                        <div className="mt-2 space-y-1 text-xs text-slate-600">
                          {item.definition && (
                            <p>
                              <span className="font-semibold text-slate-700">
                                Definition:
                              </span>{" "}
                              {item.definition}
                            </p>
                          )}
                          {item.translation && (
                            <p>
                              <span className="font-semibold text-slate-700">
                                Translation:
                              </span>{" "}
                              {item.translation}
                            </p>
                          )}
                        </div>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {activeTab === "bites" && (
          <section aria-label="Bites" className="text-sm text-slate-500">
            Coming soon: quick vocab reviews.
          </section>
        )}

        {activeTab === "feedback" && (
          <section
            aria-label="Feedback"
            className="space-y-4 text-sm text-slate-700"
          >
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
            {feedbackLoading && (
              <p className="text-slate-500">Loading feedback…</p>
            )}
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
                        <button
                          type="button"
                          onClick={() =>
                            setFeedbackExpandedId(
                              isExpanded ? null : item.id,
                            )
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
                              ? "Undo: you have not finished reading this version"
                              : "Tap when you have read this story version"
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
                            {item.reviewed
                              ? "Reviewed"
                              : "Mark as reviewed"}
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
        )}
      </div>
    </>
  );
}

