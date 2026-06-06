"use client";

import { Bookmark, ChevronDown, ListChecks, Plus } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { StudyListItem } from "@/lib/load-study-items";
import { useRapidReviewReportPending } from "@/lib/useActivityQueueProcessingTargets";
import {
  SubNavTabBar,
  subNavTabButtonClass,
} from "../_components/SubNavTabBar";
import { AddVocabScreen } from "./AddVocabScreen";
import { RapidReviewSession } from "./RapidReviewSession";
import { queueStudyItemArchive } from "./study-queue-actions";
import {
  formatMasteryScore,
  sortSavedStudyItems,
  type SavedStudySortKey as SavedSortKey,
} from "./saved-sort";

type StudyItem = StudyListItem;

const SAVED_SORT_LABELS: Record<SavedSortKey, string> = {
  /** Label for `study_items.last_used` (updated when you rate in rapid review). */
  last_used: "Last reviewed",
  created: "Created",
  mastery_score: "Mastery score",
};

const SAVED_SORT_KEYS: SavedSortKey[] = [
  "last_used",
  "created",
  "mastery_score",
];

const vocabTabs = [
  { id: "quick-review" as const, Icon: ListChecks, label: "Review" },
  { id: "add" as const, Icon: Plus, label: "Add" },
  { id: "saved" as const, Icon: Bookmark, label: "Saved" },
] as const;

type TabId = (typeof vocabTabs)[number]["id"];

/** Matches AppShell: hide tab bar, settings, and bottom nav during immersive practice. */
const RAPID_REVIEW_FLOW = "rapid-review";

/** Hub under the Study tab: pick a mode, or show a mode’s session. */
type ReviewHubMode = "choose" | "rapid-review";

type VocabReviewProps = {
  initialTab?: TabId;
  initialSavedItems?: StudyItem[];
};

function tabToParam(id: TabId): string {
  if (id === "quick-review") return "review";
  return id;
}

function paramToTab(raw: string | null): TabId | null {
  if (raw === "saved") return "saved";
  if (raw === "add") return "add";
  if (raw === "review" || raw === "quick-review") return "quick-review";
  return null;
}

export function VocabReview({
  initialTab,
  initialSavedItems,
}: VocabReviewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rapidReviewReportPending = useRapidReviewReportPending();
  const [activeTab, setActiveTab] = useState<TabId>(
    () => initialTab ?? "quick-review",
  );

  const selectTab = useCallback(
    (id: TabId) => {
      setActiveTab(id);
      router.replace(`/vocab?tab=${encodeURIComponent(tabToParam(id))}`, {
        scroll: false,
      });
    },
    [router],
  );

  const enterImmersiveRapidReview = useCallback(() => {
    router.replace(
      `/vocab?tab=review&flow=${encodeURIComponent(RAPID_REVIEW_FLOW)}`,
      { scroll: false },
    );
  }, [router]);

  const exitImmersiveRapidReview = useCallback(() => {
    router.replace("/vocab?tab=review", { scroll: false });
  }, [router]);

  const completePracticeToMomentum = useCallback(() => {
    router.replace("/continue", { scroll: false });
  }, [router]);

  const [items, setItems] = useState<StudyItem[]>(() => initialSavedItems ?? []);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exportingCsv, setExportingCsv] = useState(false);
  const [exportCsvError, setExportCsvError] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [archiveBusyId, setArchiveBusyId] = useState<string | null>(null);
  const [archiveActionError, setArchiveActionError] = useState<string | null>(
    null,
  );
  const [savedSortKey, setSavedSortKey] = useState<SavedSortKey>("created");
  const [savedSortDirection, setSavedSortDirection] = useState<"asc" | "desc">(
    "desc",
  );

  const filteredSavedItems = useMemo(
    () => (showArchived ? items : items.filter((i) => i.archived !== true)),
    [items, showArchived],
  );

  const displaySavedItems = useMemo(
    () =>
      sortSavedStudyItems(filteredSavedItems, savedSortKey, savedSortDirection),
    [filteredSavedItems, savedSortKey, savedSortDirection],
  );

  const reloadSavedItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/study-items");
      if (!res.ok) {
        throw new Error("Failed to load saved words");
      }
      const data = (await res.json()) as { items: StudyItem[] };
      setItems(data.items ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab !== "saved" || initialSavedItems) return;
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
    void load();
    return () => {
      cancelled = true;
    };
  }, [activeTab, initialSavedItems]);

  useEffect(() => {
    const t = paramToTab(searchParams.get("tab"));
    if (t) setActiveTab(t);
  }, [searchParams]);

  const flowParam = searchParams.get("flow");
  const reviewHubMode: ReviewHubMode =
    activeTab !== "quick-review"
      ? "choose"
      : flowParam === RAPID_REVIEW_FLOW
        ? "rapid-review"
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

  const immersivePractice = reviewHubMode === "rapid-review";

  const setItemArchived = useCallback(
    async (itemId: string, archived: boolean) => {
      setArchiveActionError(null);
      const prev = items;
      setItems((list) =>
        list.map((i) => (i.id === itemId ? { ...i, archived } : i)),
      );
      setArchiveBusyId(itemId);
      const res = await queueStudyItemArchive({ study_item_id: itemId, archived });
      setArchiveBusyId(null);
      if (!res.ok) {
        setItems(prev);
        setArchiveActionError(res.error);
      }
    },
    [items],
  );

  return (
    <>
      {!immersivePractice ? (
        <p className="mb-2 text-center text-xs font-medium uppercase tracking-[0.18em] text-[var(--text-muted)] sm:text-left">
          Vocab
        </p>
      ) : null}

      <div
        className={immersivePractice ? "min-h-[85dvh] py-2" : "min-h-[50vh] py-2"}
      >
        {activeTab === "add" && (
          <section
            aria-label="Add vocabulary"
            className="text-sm text-[var(--prose-text)]"
          >
            <AddVocabScreen onWordsSaved={() => void reloadSavedItems()} />
          </section>
        )}

        {activeTab === "saved" && (
          <section aria-label="Saved words" className="space-y-4 text-sm text-[var(--prose-text)]">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-2">
              {SAVED_SORT_KEYS.map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    if (key === savedSortKey) {
                      setSavedSortDirection((d) => (d === "asc" ? "desc" : "asc"));
                    } else {
                      setSavedSortKey(key);
                      setSavedSortDirection("desc");
                    }
                  }}
                  className={`inline-flex items-center gap-1 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                    key === savedSortKey
                      ? "border-[var(--border-strong)] bg-[var(--nav-active-bg)] text-[var(--nav-active-fg)]"
                      : "border-[var(--border-default)] bg-[var(--field-bg)] text-[var(--field-text)] hover:border-[var(--border-strong)]"
                  }`}
                >
                  <span>{SAVED_SORT_LABELS[key]}</span>
                  {key === savedSortKey ? (
                    <span
                      className="ml-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-lg bg-[var(--nav-active-fg)]/18 text-base font-bold leading-none text-[var(--nav-active-fg)]"
                      aria-hidden
                    >
                      {savedSortDirection === "asc" ? "↑" : "↓"}
                    </span>
                  ) : null}
                </button>
              ))}
            </div>

            <div>
              <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-[var(--foreground)]">
                <input
                  type="checkbox"
                  checked={showArchived}
                  onChange={(e) => setShowArchived(e.target.checked)}
                  className="h-4 w-4 shrink-0 rounded border-[var(--border-strong)] accent-[var(--nav-active-bg)] focus:ring-[var(--nav-active-bg)]"
                />
                Show archived
              </label>
            </div>

            <div>
              <button
                type="button"
                onClick={downloadStudyItemsCsv}
                disabled={exportingCsv}
                className="inline-flex shrink-0 items-center justify-center rounded-2xl border border-[var(--border-default)] bg-[var(--field-bg)] px-4 py-2 text-xs font-semibold text-[var(--field-text)] shadow-sm transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-elevated)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {exportingCsv ? "Exporting…" : "Export to CSV"}
              </button>
            </div>

            {exportCsvError && (
              <p className="text-sm text-[var(--semantic-danger-inline)]">{exportCsvError}</p>
            )}
            {archiveActionError && (
              <p className="text-sm text-[var(--semantic-danger-inline)]">{archiveActionError}</p>
            )}
            {loading && (
              <p className="text-[var(--text-muted)]">Loading saved words…</p>
            )}
            {error && <p className="text-[var(--semantic-danger-inline)]">{error}</p>}
            {!loading && !error && items.length === 0 && (
              <p className="text-[var(--text-muted)]">No saved words yet.</p>
            )}
            {!loading &&
              !error &&
              items.length > 0 &&
              displaySavedItems.length === 0 && (
                <p className="text-[var(--text-muted)]">
                  No words to show. Enable &quot;Show archived&quot; to see archived items.
                </p>
              )}

            <ul className="divide-y divide-[var(--border-default)] rounded-2xl border border-[var(--border-default)] bg-[var(--surface-panel)]">
              {displaySavedItems.map((item) => {
                const isExpanded = expandedId === item.id;
                const archived = item.archived === true;
                const archiveBusy = archiveBusyId === item.id;
                const toggleExpanded = () =>
                  setExpandedId(isExpanded ? null : item.id);
                return (
                  <li key={item.id} className="flex flex-col">
                    <div
                      className={[
                        "transition-colors",
                        isExpanded
                          ? "bg-[var(--nav-hover-bg)]"
                          : "hover:bg-[var(--nav-hover-bg)]",
                      ].join(" ")}
                    >
                      <div className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 px-3 py-2.5">
                        <button
                          type="button"
                          aria-expanded={isExpanded}
                          aria-label={isExpanded ? "Collapse details" : "Expand details"}
                          onClick={toggleExpanded}
                          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[var(--field-placeholder)] transition-colors hover:bg-[var(--surface-elevated)] hover:text-[var(--foreground)]"
                        >
                          <ChevronDown
                            strokeWidth={2}
                            className={`h-4 w-4 shrink-0 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
                            aria-hidden
                          />
                        </button>
                        <button
                          type="button"
                          onClick={toggleExpanded}
                          className="min-w-0 text-left"
                        >
                          <span className="flex min-w-0 items-baseline gap-1.5">
                            <span className="min-w-0 truncate font-medium text-[var(--foreground)]">
                              {item.vocab}
                            </span>
                            {archived ? (
                              <span className="shrink-0 text-xs font-normal text-[var(--text-muted)]">
                                (archived)
                              </span>
                            ) : null}
                          </span>
                        </button>
                        <div className="relative z-[1] flex max-w-[9.5rem] flex-col gap-0.5 border-l border-[var(--border-default)] pl-2">
                          <label
                            className={`inline-flex shrink-0 cursor-pointer items-center gap-1.5 text-xs font-medium leading-none text-[var(--foreground)] ${archiveBusy ? "pointer-events-none opacity-60" : ""}`}
                          >
                            <input
                              type="checkbox"
                              checked={archived}
                              disabled={archiveBusy}
                              onChange={(e) => {
                                void setItemArchived(item.id, e.target.checked);
                              }}
                              className="h-4 w-4 shrink-0 rounded border-[var(--border-strong)] accent-[var(--nav-active-bg)] focus:ring-2 focus:ring-[var(--nav-active-bg)] focus:ring-offset-1 focus:ring-offset-[var(--surface-panel)] disabled:opacity-60"
                              title={archived ? "Unarchive" : "Archive"}
                            />
                            <span>Archive</span>
                          </label>
                          <p className="text-[0.65rem] leading-tight text-[var(--text-muted)]">
                            Mastery{" "}
                            <span className="tabular-nums font-semibold text-[var(--foreground)]">
                              {formatMasteryScore(item.mastery_score)}
                            </span>
                          </p>
                        </div>
                      </div>

                      {isExpanded ? (
                        <div className="space-y-1.5 border-t border-[var(--border-default)] px-3 pb-2.5 pt-2 text-xs text-[var(--text-muted)]">
                          {item.example_sentences ? (
                            <p>
                              <span className="font-semibold text-[var(--foreground)]">
                                Example:
                              </span>{" "}
                              {item.example_sentences}
                            </p>
                          ) : null}
                          {item.definition ? (
                            <p>
                              <span className="font-semibold text-[var(--foreground)]">
                                Definition:
                              </span>{" "}
                              {item.definition}
                            </p>
                          ) : null}
                          {item.translation ? (
                            <p>
                              <span className="font-semibold text-[var(--foreground)]">
                                Translation:
                              </span>{" "}
                              {item.translation}
                            </p>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {activeTab === "quick-review" && (
          <section
            aria-label="Study vocabulary"
            className="space-y-6 text-sm text-[var(--prose-text)]"
          >
            {reviewHubMode === "choose" ? (
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <button
                  type="button"
                  onClick={enterImmersiveRapidReview}
                  disabled={rapidReviewReportPending}
                  className={[
                    "inline-flex w-full flex-col items-center justify-center gap-0.5 rounded-2xl border px-4 py-3.5 text-center shadow-sm transition-colors sm:max-w-sm",
                    rapidReviewReportPending
                      ? "cursor-not-allowed border-[var(--border-default)] bg-[var(--surface-elevated)] text-[var(--field-placeholder)] opacity-90"
                      : "border-[var(--border-strong)] bg-[var(--nav-active-bg)] text-[var(--nav-active-fg)] hover:opacity-90",
                  ].join(" ")}
                >
                  <span
                    className={
                      rapidReviewReportPending
                        ? "text-sm font-semibold text-[var(--field-placeholder)]"
                        : "text-sm font-semibold text-[var(--nav-active-fg)]"
                    }
                  >
                    {rapidReviewReportPending ? "Processing…" : "Start review"}
                  </span>
                  <span
                    className={
                      rapidReviewReportPending
                        ? "text-xs font-normal text-[var(--field-placeholder)]"
                        : "text-xs font-normal text-[var(--nav-active-fg)]/80"
                    }
                  >
                    {rapidReviewReportPending
                      ? "Last session is still syncing"
                      : "Up to 10 words · tap to begin"}
                  </span>
                </button>
              </div>
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

      {!immersivePractice ? (
        <SubNavTabBar ariaLabel="Vocab">
          {vocabTabs.map((tab) => {
            const isActive = tab.id === activeTab;
            const Icon = tab.Icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => selectTab(tab.id)}
                aria-current={isActive ? "page" : undefined}
                className={subNavTabButtonClass(isActive)}
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
        </SubNavTabBar>
      ) : null}
    </>
  );
}
