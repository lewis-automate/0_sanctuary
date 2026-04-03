"use client";

import {
  Activity,
  BookOpen,
  FilePenLine,
  LayoutDashboard,
  ListChecks,
  Plus,
  SquarePen,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { QuickCreateStoryButton } from "./_components/QuickCreateStoryButton";
import {
  SubNavTabBar,
  subNavTabButtonClass,
} from "./_components/SubNavTabBar";
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
  initialTab?: TabId;
  quickReadHref: string;
  stats: HomeStats;
};

export function HomeDashboard({ initialTab, quickReadHref, stats }: Props) {
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

  /** Fixed-width column so icons share one vertical rhythm; label fills the rest. */
  const quickActionIconCell =
    "flex w-10 shrink-0 items-center justify-start self-stretch";

  const quickActionLabel = "min-w-0 flex-1 text-left text-sm font-medium leading-snug";

  const quickCreateTitle = quickActionLabel;

  const quickIconClass = "h-4 w-4 shrink-0 text-[var(--nav-idle-text)]";

  return (
    <>
      <p className="mb-2 text-center text-xs font-medium uppercase tracking-[0.18em] text-[var(--text-muted)] sm:text-left">
        Sanctuary
      </p>

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

            <section
              aria-label="Quick actions"
              className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-panel)] p-3 sm:p-3.5"
            >
              <div className="grid grid-cols-2 gap-2">
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
                <Link href={quickReadHref} className={quickActionBtn}>
                  <span className={quickActionIconCell}>
                    <BookOpen
                      className={quickIconClass}
                      strokeWidth={2}
                      aria-hidden
                    />
                  </span>
                  <span className={quickActionLabel}>Quick read</span>
                </Link>
                <Link href="/vocab?tab=quick-review" className={quickActionBtn}>
                  <span className={quickActionIconCell}>
                    <ListChecks
                      className={quickIconClass}
                      strokeWidth={2}
                      aria-hidden
                    />
                  </span>
                  <span className={quickActionLabel}>Vocab review</span>
                </Link>
                <Link href="/writing?tab=writenow" className={quickActionBtn}>
                  <span className={quickActionIconCell}>
                    <SquarePen
                      className={quickIconClass}
                      strokeWidth={2}
                      aria-hidden
                    />
                  </span>
                  <span className={quickActionLabel}>Write</span>
                </Link>
                <Link
                  href="/vocab?tab=add"
                  className={`${quickActionBtn} col-span-2`}
                >
                  <span className={quickActionIconCell}>
                    <Plus
                      className={quickIconClass}
                      strokeWidth={2}
                      aria-hidden
                    />
                  </span>
                  <span className={quickActionLabel}>Add vocab</span>
                </Link>
              </div>
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
