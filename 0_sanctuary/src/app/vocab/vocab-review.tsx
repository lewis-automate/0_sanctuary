"use client";

import { Bookmark, ListChecks, Plus } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { useCallback, useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import {
  SubNavTabBar,
  subNavTabButtonClass,
} from "../_components/SubNavTabBar";
import { AddVocabScreen } from "./AddVocabScreen";
import { RapidReviewSession } from "./RapidReviewSession";
import { queueStudyItemArchive } from "./study-queue-actions";

type StudyItem = {
  id: string;
  vocab: string;
  example_sentences: string | null;
  definition: string | null;
  translation: string | null;
  archived: boolean | null;
};

const vocabTabs = [
  { id: "saved" as const, Icon: Bookmark, label: "Saved" },
  { id: "quick-review" as const, Icon: ListChecks, label: "Practice" },
  { id: "add" as const, Icon: Plus, label: "Add" },
] as const;

type TabId = (typeof vocabTabs)[number]["id"];

/** Matches AppShell: hide tab bar, settings, and bottom nav during immersive practice. */
const RAPID_REVIEW_FLOW = "rapid-review";

/** Hub under the Practice tab: pick a mode, or show a mode’s session. */
type ReviewHubMode = "choose" | "rapid-review";

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

  const [items, setItems] = useState<StudyItem[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exportingCsv, setExportingCsv] = useState(false);
  const [exportCsvError, setExportCsvError] = useState<string | null>(null);
  const [rapidReviewReportPending, setRapidReviewReportPending] =
    useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [archiveBusyId, setArchiveBusyId] = useState<string | null>(null);
  const [archiveActionError, setArchiveActionError] = useState<string | null>(
    null,
  );

  const visibleSavedItems = showArchived
    ? items
    : items.filter((i) => i.archived !== true);

  useEffect(() => {
    const supabase = getSupabase();
    let mounted = true;
    let channel: RealtimeChannel | null = null;

    async function refreshRapidReviewPending(userId: string) {
      const { data } = await supabase
        .from("activity_queue")
        .select("id")
        .eq("user_id", userId)
        .eq("event_type", "rapid_review_complete")
        .in("status", ["pending", "processing"]);
      if (mounted) {
        setRapidReviewReportPending(
          Array.isArray(data) && data.length > 0,
        );
      }
    }

    supabase.auth.getUser().then(({ data: { user } }: { data: { user: { id: string } | null } }) => {
      if (!mounted) return;
      if (!user) {
        setRapidReviewReportPending(false);
        return;
      }
      void refreshRapidReviewPending(user.id);
      channel = supabase
        .channel("vocab_rapid_review_report_pending")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "activity_queue",
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            void refreshRapidReviewPending(user.id);
          },
        )
        .subscribe();
    });

    return () => {
      mounted = false;
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

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
        {activeTab === "saved" && (
          <section aria-label="Saved words" className="space-y-4 text-sm text-[var(--prose-text)]">
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={downloadStudyItemsCsv}
                disabled={exportingCsv}
                className="inline-flex shrink-0 items-center justify-center rounded-2xl border border-[var(--border-default)] bg-[var(--field-bg)] px-4 py-2 text-xs font-semibold text-[var(--field-text)] shadow-sm transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-elevated)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {exportingCsv ? "Exporting…" : "Export to CSV"}
              </button>
            </div>

            <div className="mt-2">
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
              visibleSavedItems.length === 0 && (
                <p className="text-[var(--text-muted)]">
                  No words to show. Enable &quot;Show archived&quot; to see archived items.
                </p>
              )}

            <ul className="divide-y divide-[var(--border-default)] rounded-2xl border border-[var(--border-default)] bg-[var(--surface-panel)]">
              {visibleSavedItems.map((item) => {
                const isExpanded = expandedId === item.id;
                const archived = item.archived === true;
                const archiveBusy = archiveBusyId === item.id;
                return (
                  <li key={item.id} className="flex flex-col">
                    <div className="space-y-2 px-4 py-3 hover:bg-[var(--nav-hover-bg)]">
                      {/* Grid: second column is always sized for Archive + Show (flex alone can still clip it). */}
                      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setExpandedId(isExpanded ? null : item.id)}
                          className="flex min-w-0 text-left"
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
                        <div className="relative z-[1] flex flex-nowrap items-center gap-2 border-l border-[var(--border-default)] pl-2">
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
                          <button
                            type="button"
                            onClick={() => setExpandedId(isExpanded ? null : item.id)}
                            className="shrink-0 text-xs font-medium text-[var(--field-placeholder)] hover:text-[var(--foreground)]"
                          >
                            {isExpanded ? "Hide" : "Show"}
                          </button>
                        </div>
                      </div>
                      {item.example_sentences ? (
                        <button
                          type="button"
                          onClick={() => setExpandedId(isExpanded ? null : item.id)}
                          className="w-full text-left"
                        >
                          <p className="line-clamp-2 text-xs text-[var(--text-muted)]">
                            {item.example_sentences}
                          </p>
                        </button>
                      ) : null}
                    </div>

                    {isExpanded ? (
                      <div className="space-y-1 border-t border-[var(--border-default)] px-4 pb-3 pt-2 text-xs text-[var(--text-muted)]">
                        {item.definition && (
                          <p>
                            <span className="font-semibold text-[var(--foreground)]">
                              Definition:
                            </span>{" "}
                            {item.definition}
                          </p>
                        )}
                        {item.translation && (
                          <p>
                            <span className="font-semibold text-[var(--foreground)]">
                              Translation:
                            </span>{" "}
                            {item.translation}
                          </p>
                        )}
                      </div>
                    ) : null}
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
            className="space-y-6 text-sm text-[var(--prose-text)]"
          >
            {reviewHubMode === "choose" ? (
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <button
                  type="button"
                  onClick={enterImmersiveRapidReview}
                  disabled={rapidReviewReportPending}
                  className={[
                    "inline-flex flex-1 flex-col items-center justify-center gap-0.5 rounded-full border px-4 py-3 text-center shadow-sm transition-colors sm:min-w-[10rem] sm:flex-initial",
                    rapidReviewReportPending
                      ? "cursor-not-allowed border-[var(--border-default)] bg-[var(--surface-elevated)] text-[var(--field-placeholder)] opacity-90"
                      : "border-[var(--border-default)] bg-[var(--field-bg)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-elevated)]",
                  ].join(" ")}
                >
                  <span
                    className={
                      rapidReviewReportPending
                        ? "text-sm font-medium text-[var(--field-placeholder)]"
                        : "text-sm font-medium text-[var(--foreground)]"
                    }
                  >
                    {rapidReviewReportPending ? "Processing…" : "Rapid review"}
                  </span>
                  <span
                    className={
                      rapidReviewReportPending
                        ? "text-xs font-normal text-[var(--field-placeholder)]"
                        : "text-xs font-normal text-[var(--text-muted)]"
                    }
                  >
                    {rapidReviewReportPending
                      ? "Last session is still syncing"
                      : "Review up to 10 words"}
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
        <SubNavTabBar ariaLabel="Saved, practice, and add">
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
