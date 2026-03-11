"use client";

import { useEffect, useState } from "react";

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
  const [copiedId, setCopiedId] = useState<string | null>(null);

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
          setFeedbackItems(data.items ?? []);
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
            <p className="text-xs text-slate-500">
              Coming soon: csv export, archive buttons, and the options to save words in isolation (they are automatically chunked into pairs by default).
            </p>
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
            {!feedbackLoading && !feedbackError && feedbackItems.length === 0 && (
              <p className="text-slate-500">No feedback yet.</p>
            )}

            <ul className="divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white/70">
              {feedbackItems.map((item) => {
                const isExpanded = feedbackExpandedId === item.id;
                return (
                  <li key={item.id}>
                    <div className="flex w-full flex-col gap-1 px-4 py-3 text-left hover:bg-slate-50">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <p className="font-medium text-slate-900">
                            {item.raw_input}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
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
                            className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-500 hover:border-slate-400 hover:text-slate-900"
                            aria-label="Copy feedback"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 20 20"
                              className="h-3.5 w-3.5"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.4"
                            >
                              <rect
                                x="7"
                                y="5"
                                width="9"
                                height="11"
                                rx="2"
                              />
                              <path d="M5 13H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h7" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setFeedbackExpandedId(
                                isExpanded ? null : item.id,
                              )
                            }
                            className="mt-1 text-xs text-slate-400 hover:text-slate-600"
                          >
                            {isExpanded ? "Hide" : "Show"}
                          </button>
                        </div>
                      </div>

                      {copiedId === item.id && (
                        <div className="mt-1 text-right text-[11px] font-medium text-slate-500 transition-opacity duration-300">
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

