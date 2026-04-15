"use client";

import {
  Activity,
  BookOpen,
  FilePenLine,
  LayoutDashboard,
  ListChecks,
  NotebookText,
  Tag,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { QuickCreateStoryButton } from "./_components/QuickCreateStoryButton";
import {
  SubNavTabBar,
  subNavTabButtonClass,
} from "./_components/SubNavTabBar";
import {
  ReadingYearCalendar,
  type ReadingCalendarModel,
} from "./_components/ReadingYearCalendar";
import type { ShowUpEncouragement } from "@/lib/show-up-encouragement";
import { CurrentActivities } from "./library/CurrentActivities";

export type HomeStats = {
  wordsRead30d: number;
  wordsReadAllTime: number;
  completedReads30d: number;
  completedReadsAllTime: number;
  savedWords30d: number;
  savedWordsTotal: number;
};

const homeTabs = [
  { id: "main" as const, Icon: LayoutDashboard, label: "Main" },
  { id: "activity" as const, Icon: Activity, label: "Activity" },
] as const;

type TabId = (typeof homeTabs)[number]["id"];

type Props = {
  welcomeName: string;
  initialTab?: TabId;
  quickReadHref: string;
  stats: HomeStats;
  readingCalendar: ReadingCalendarModel;
  showUpEncouragement: ShowUpEncouragement | null;
};

export function HomeDashboard({
  welcomeName,
  initialTab,
  quickReadHref,
  stats,
  readingCalendar,
  showUpEncouragement,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabId>(
    () => initialTab ?? "main",
  );

  const selectTab = useCallback(
    (id: TabId) => {
      setActiveTab(id);
      router.replace(`/?tab=${encodeURIComponent(id)}`, { scroll: false });
    },
    [router],
  );

  useEffect(() => {
    const t = searchParams.get("tab");
    if (t === "activity") {
      setActiveTab("activity");
      return;
    }
    if (t === "main") {
      setActiveTab("main");
      return;
    }
    if (t === "shortcuts" || t === "progress") {
      setActiveTab("main");
      router.replace("/?tab=main", { scroll: false });
      return;
    }
    if (t === null || t === "") {
      setActiveTab("main");
    }
  }, [searchParams, router]);

  const colHeader =
    "text-right text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--text-muted)] sm:text-xs";
  const statLabel =
    "text-left text-xs font-medium uppercase tracking-[0.14em] text-[var(--text-muted)]";
  const statNum =
    "text-right text-base font-semibold tabular-nums text-[var(--foreground)] sm:text-lg";

  const quickActionBtn =
    "flex w-full min-h-[2.75rem] items-center justify-start gap-3 rounded-xl border border-[var(--border-default)] bg-[var(--surface-panel)] px-3 py-2 text-sm font-medium text-[var(--foreground)] shadow-sm transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-elevated)] active:bg-[var(--surface-elevated)]";

  /** Full-width primary CTA for Quick read */
  const quickReadMainBtn =
    "flex w-full min-h-[3rem] items-center justify-center gap-3 rounded-2xl border border-[var(--border-strong)] bg-[var(--nav-active-bg)] px-4 py-3 text-sm font-semibold text-[var(--nav-active-fg)] shadow-sm transition-[opacity,transform] hover:opacity-90 active:scale-[0.995]";

  /** Fixed-width column so icons share one vertical rhythm; label fills the rest. */
  const quickActionIconCell =
    "flex w-10 shrink-0 items-center justify-start self-stretch";

  const quickActionLabel = "min-w-0 flex-1 text-left text-sm font-medium leading-snug";

  const quickCreateTitle = quickActionLabel;

  const quickIconClass = "h-4 w-4 shrink-0 text-[var(--nav-idle-text)]";

  /** Soft intro copy — italic body, relaxed for full sentences */
  const introText =
    "text-sm italic leading-relaxed text-[var(--text-muted)]";

  return (
    <>
      <div className="mb-4 mx-auto max-w-[min(100%,20rem)] text-center">
        <div className="flex flex-col items-center" aria-label="Introduction">
          {welcomeName ? (
            <div className="flex flex-col gap-0 [&>p]:m-0">
              <p className={`${introText} leading-snug`}>
                Hi{" "}
                <span className="text-[var(--prose-text)]">{welcomeName}</span>,
              </p>
              <p className={`${introText} leading-snug`}>
                Welcome back to Sanctuary.
              </p>
            </div>
          ) : (
            <p className={introText}>Welcome back to Sanctuary.</p>
          )}
        </div>
      </div>

      <div className="min-h-[50vh] py-2">
        {activeTab === "activity" && (
          <section
            aria-label="Background activity"
            className="rounded-3xl border border-[var(--border-default)] bg-[var(--surface-panel)] p-6"
          >
            <CurrentActivities />
          </section>
        )}

        {activeTab === "main" && (
          <div className="space-y-4">
            <section
              aria-label="Quick actions"
              className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-panel)] p-3 sm:p-3.5"
            >
              <div className="grid grid-cols-2 gap-2">
                <Link
                  href={quickReadHref}
                  className={`${quickReadMainBtn} col-span-2`}
                >
                  <BookOpen
                    className="h-5 w-5 shrink-0 text-[var(--nav-active-fg)] opacity-95"
                    strokeWidth={2}
                    aria-hidden
                  />
                  <span>Quick read</span>
                </Link>
                <QuickCreateStoryButton
                  className={quickActionBtn}
                  titleClassName={quickCreateTitle}
                  subClassName=""
                  compact
                  leadingIcon={
                    <FilePenLine
                      className={quickIconClass}
                      strokeWidth={2}
                      aria-hidden
                    />
                  }
                />
                <Link href="/settings?tab=topics" className={quickActionBtn}>
                  <span className={quickActionIconCell}>
                    <Tag
                      className={quickIconClass}
                      strokeWidth={2}
                      aria-hidden
                    />
                  </span>
                  <span className={quickActionLabel}>Set new topic</span>
                </Link>
                <Link href="/writing" className={quickActionBtn}>
                  <span className={quickActionIconCell}>
                    <NotebookText
                      className={quickIconClass}
                      strokeWidth={2}
                      aria-hidden
                    />
                  </span>
                  <span className={quickActionLabel}>Review writing</span>
                </Link>
                <Link href="/vocab?tab=quick-review" className={quickActionBtn}>
                  <span className={quickActionIconCell}>
                    <ListChecks
                      className={quickIconClass}
                      strokeWidth={2}
                      aria-hidden
                    />
                  </span>
                  <span className={quickActionLabel}>Review vocab</span>
                </Link>
              </div>
            </section>

            <section
              aria-label="Reading progress"
              className="rounded-3xl border border-[var(--border-default)] bg-[var(--surface-panel)] p-6"
            >
              <table className="w-full border-collapse text-sm text-[var(--foreground)]">
                <thead>
                  <tr>
                    <th className="w-0 min-w-0 pb-2 pr-2 sm:pr-3" />
                    <th
                      className={`${colHeader} w-[5.5rem] pb-2 pl-2 pr-0 font-normal sm:w-[7rem] sm:pl-3`}
                    >
                      Last 30 days
                    </th>
                    <th
                      className={`${colHeader} w-[5.5rem] pb-2 pl-2 pr-0 font-normal sm:w-[7rem] sm:pl-3`}
                    >
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <th
                      scope="row"
                      className={`${statLabel} py-2 pr-2 text-left align-middle font-normal sm:pr-3`}
                    >
                      Words read
                    </th>
                    <td
                      className={`${statNum} py-2 pl-2 pr-0 align-middle sm:pl-3`}
                    >
                      {stats.wordsRead30d.toLocaleString()}
                    </td>
                    <td
                      className={`${statNum} py-2 pl-2 pr-0 align-middle sm:pl-3`}
                    >
                      {stats.wordsReadAllTime.toLocaleString()}
                    </td>
                  </tr>
                  <tr>
                    <th
                      scope="row"
                      className={`${statLabel} py-2 pr-2 text-left align-middle font-normal sm:pr-3`}
                    >
                      Passages read
                    </th>
                    <td
                      className={`${statNum} py-2 pl-2 pr-0 align-middle sm:pl-3`}
                    >
                      {stats.completedReads30d.toLocaleString()}
                    </td>
                    <td
                      className={`${statNum} py-2 pl-2 pr-0 align-middle sm:pl-3`}
                    >
                      {stats.completedReadsAllTime.toLocaleString()}
                    </td>
                  </tr>
                  <tr>
                    <th
                      scope="row"
                      className={`${statLabel} py-2 pr-2 text-left align-middle font-normal sm:pr-3`}
                    >
                      Vocab saved
                    </th>
                    <td
                      className={`${statNum} py-2 pl-2 pr-0 align-middle sm:pl-3`}
                    >
                      {stats.savedWords30d.toLocaleString()}
                    </td>
                    <td
                      className={`${statNum} py-2 pl-2 pr-0 align-middle sm:pl-3`}
                    >
                      {stats.savedWordsTotal.toLocaleString()}
                    </td>
                  </tr>
                </tbody>
              </table>
            </section>

            {showUpEncouragement ? (
              <section
                aria-label="Your month so far"
                className="rounded-3xl border border-[var(--border-default)]/80 bg-[var(--surface-panel)] px-4 py-3.5 sm:px-5 sm:py-4"
              >
                <p className="text-sm leading-relaxed text-[var(--foreground)]">
                  <span className="font-medium text-[var(--prose-text)]">
                    {showUpEncouragement.summaryLine}
                  </span>
                </p>
                <p
                  className={`${introText} mt-2 text-left sm:text-center`}
                >
                  {showUpEncouragement.encouragement}
                </p>
              </section>
            ) : null}

            <section
              aria-label="Reading calendar"
              className="rounded-3xl border border-[var(--border-default)] bg-[var(--surface-panel)] p-3 sm:p-4"
            >
              <ReadingYearCalendar model={readingCalendar} />
            </section>
          </div>
        )}
      </div>

      <SubNavTabBar ariaLabel="Main and activity">
        {homeTabs.map((tab) => {
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
    </>
  );
}
