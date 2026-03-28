"use client";

import { Bookmark, ListChecks, Plus } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { AddVocabScreen } from "./AddVocabScreen";
import { FiveSentencesSession } from "./FiveSentencesSession";
import { RapidReviewSession } from "./RapidReviewSession";

type StudyItem = {
  id: string;
  vocab: string;
  example_sentences: string | null;
  definition: string | null;
  translation: string | null;
};

const vocabTabs = [
  { id: "saved" as const, Icon: Bookmark, label: "Saved" },
  { id: "quick-review" as const, Icon: ListChecks, label: "Practice" },
  { id: "add" as const, Icon: Plus, label: "Add" },
] as const;

type TabId = (typeof vocabTabs)[number]["id"];

/** Matches AppShell: hide tab bar, settings, and bottom nav during immersive practice. */
const RAPID_REVIEW_FLOW = "rapid-review";
const HYPER_FOCUS_FLOW = "hyper-focus";
/** Older bookmarks / share links */
const LEGACY_HYPER_FOCUS_FLOW = "five-sentences";

/** Hub under the Practice tab: pick a mode, or show a mode’s placeholder session. */
type ReviewHubMode = "choose" | "hyper-focus" | "rapid-review";

type VocabReviewProps = {
  initialTab?: TabId;
};

export function VocabReview({ initialTab }: VocabReviewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabId>(
    () => initialTab ?? "quick-review",
  );

  const selectTab = useCallback(
    (id: TabId) => {
      setActiveTab(id);
      router.replace(`/vocab?tab=${encodeURIComponent(id)}`, { scroll: false });
    },
    [router],
  );

  const enterImmersiveRapidReview = useCallback(() => {
    router.replace(
      `/vocab?tab=quick-review&flow=${encodeURIComponent(RAPID_REVIEW_FLOW)}`,
      { scroll: false },
    );
  }, [router]);

  const exitImmersiveRapidReview = useCallback(() => {
    router.replace("/vocab?tab=quick-review", { scroll: false });
  }, [router]);

  const completePracticeToMomentum = useCallback(() => {
    router.replace("/continue", { scroll: false });
  }, [router]);

  const enterImmersiveHyperFocus = useCallback(() => {
    router.replace(
      `/vocab?tab=quick-review&flow=${encodeURIComponent(HYPER_FOCUS_FLOW)}`,
      { scroll: false },
    );
  }, [router]);

  const exitImmersiveHyperFocus = useCallback(() => {
    router.replace("/vocab?tab=quick-review", { scroll: false });
  }, [router]);
  const [items, setItems] = useState<StudyItem[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exportingCsv, setExportingCsv] = useState(false);
  const [exportCsvError, setExportCsvError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/study-items");
        if (!res.ok) {
          throw new Error("Failed to load saved words");
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
    const t = searchParams.get("tab");
    if (t === "add" || t === "saved" || t === "quick-review") {
      setActiveTab(t);
    }
  }, [searchParams]);

  const flowParam = searchParams.get("flow");
  const reviewHubMode: ReviewHubMode =
    activeTab !== "quick-review"
      ? "choose"
      : flowParam === RAPID_REVIEW_FLOW
        ? "rapid-review"
        : flowParam === HYPER_FOCUS_FLOW ||
            flowParam === LEGACY_HYPER_FOCUS_FLOW
          ? "hyper-focus"
          : "choose";

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

  const immersivePractice =
    reviewHubMode === "rapid-review" || reviewHubMode === "hyper-focus";

  return (
    <>
      {!immersivePractice ? (
        <>
          <p className="mb-3 text-center text-xs font-medium uppercase tracking-[0.18em] text-slate-500 sm:text-left">
            Vocab
          </p>

          <div className="sticky top-0 z-40 -mx-6 mb-6 border-b border-slate-200 bg-[#FDFCFB]/95 px-6 pt-1 backdrop-blur">
            <nav
              aria-label="Saved, practice, and add"
              className="flex gap-2 py-2 text-sm font-medium text-slate-600"
            >
              {vocabTabs.map((tab) => {
                const isActive = tab.id === activeTab;
                const Icon = tab.Icon;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => selectTab(tab.id)}
                    aria-current={isActive ? "page" : undefined}
                    className={[
                      "flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-full px-2 py-2 transition-colors sm:gap-2 sm:px-3",
                      isActive
                        ? "bg-slate-950 text-[#FDFCFB]"
                        : "bg-transparent text-slate-700 hover:bg-slate-900/5 hover:text-slate-900",
                    ].join(" ")}
                  >
                    <Icon
                      className="h-[1.125rem] w-[1.125rem] shrink-0"
                      strokeWidth={2}
                      aria-hidden
                    />
                    <span className="truncate text-xs sm:text-sm">{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </>
      ) : null}

      <div
        className={immersivePractice ? "min-h-[85dvh] py-2" : "min-h-[50vh] py-8"}
      >
        {activeTab === "saved" && (
          <section aria-label="Saved words" className="space-y-4 text-sm text-slate-700">
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
            {loading && <p className="text-slate-500">Loading saved words…</p>}
            {error && <p className="text-red-600">{error}</p>}
            {!loading && !error && items.length === 0 && (
              <p className="text-slate-500">No saved words yet.</p>
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

        {activeTab === "add" && (
          <section aria-label="Add vocabulary">
            <AddVocabScreen headingLevel={2} />
          </section>
        )}

        {activeTab === "quick-review" && (
          <section
            aria-label="Practice"
            className="space-y-6 text-sm text-slate-700"
          >
            {reviewHubMode === "choose" ? (
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <button
                  type="button"
                  onClick={enterImmersiveHyperFocus}
                  className="inline-flex flex-1 items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50 sm:min-w-[10rem] sm:flex-initial"
                >
                  Hyper focus
                </button>
                <button
                  type="button"
                  onClick={enterImmersiveRapidReview}
                  className="inline-flex flex-1 items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50 sm:min-w-[10rem] sm:flex-initial"
                >
                  Rapid review
                </button>
              </div>
            ) : null}
            {reviewHubMode === "hyper-focus" ? (
              <FiveSentencesSession
                onBack={exitImmersiveHyperFocus}
                onComplete={completePracticeToMomentum}
              />
            ) : null}
            {reviewHubMode === "rapid-review" ? (
              <RapidReviewSession
                onExit={exitImmersiveRapidReview}
                onComplete={completePracticeToMomentum}
              />
            ) : null}
          </section>
        )}
      </div>
    </>
  );
}
