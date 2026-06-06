"use client";

import { BookOpen, ListChecks, NotebookText, Plus, SquarePen } from "lucide-react";
import {
  HomeActionTile,
  homeActionTileSecondaryClass,
  homeActionTileSecondaryIconBadgeClass,
  homeActionTileSecondarySubtitleClass,
  homeActionTileSecondaryTitleClass,
  IconWithPlusBadge,
} from "./_components/HomeActionTile";
import { QuickCreateStoryButton } from "./_components/QuickCreateStoryButton";
import {
  ReadingYearCalendar,
  type ReadingCalendarModel,
} from "./_components/ReadingYearCalendar";

export type HomeStats = {
  wordsRead30d: number;
  wordsReadAllTime: number;
  completedReads30d: number;
  completedReadsAllTime: number;
  savedWords30d: number;
  savedWordsTotal: number;
};

type Props = {
  welcomeName: string;
  quickReadHref: string;
  stats: HomeStats;
  readingCalendar: ReadingCalendarModel;
  showUpSummary: string | null;
};

export function HomeDashboard({
  welcomeName,
  quickReadHref,
  stats,
  readingCalendar,
  showUpSummary,
}: Props) {
  const colHeader =
    "text-right text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--text-muted)] sm:text-xs";
  const statLabel =
    "text-left text-xs font-medium uppercase tracking-[0.14em] text-[var(--text-muted)]";
  const statNum =
    "text-right text-base font-semibold tabular-nums text-[var(--foreground)] sm:text-lg";

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

      <div className="min-h-[50vh] space-y-4 py-2">
        <section
          aria-label="Quick actions"
          className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-panel)] p-3 sm:p-3.5"
        >
          <div className="grid grid-cols-2 gap-2">
            <QuickCreateStoryButton
              className={homeActionTileSecondaryClass}
              titleClassName={homeActionTileSecondaryTitleClass}
              subClassName={homeActionTileSecondarySubtitleClass}
              iconBadgeClassName={homeActionTileSecondaryIconBadgeClass}
              layout="vertical"
              compact
              title="Quick create passages"
              compactSubtitle="Uses current settings"
              leadingIcon={<IconWithPlusBadge />}
            />
            <HomeActionTile
              variant="primary"
              href={quickReadHref}
              title="Read now"
              subtitle="Continue your story"
              icon={
                <BookOpen className="h-5 w-5" strokeWidth={2} aria-hidden />
              }
            />
            <HomeActionTile
              href="/vocab?tab=add"
              title="Add vocab"
              subtitle="Type words to save"
              icon={
                <Plus className="h-4 w-4" strokeWidth={2} aria-hidden />
              }
            />
            <HomeActionTile
              href="/vocab?tab=review&flow=rapid-review"
              title="Review vocab"
              subtitle="Up to 10 words"
              icon={
                <ListChecks className="h-4 w-4" strokeWidth={2} aria-hidden />
              }
            />
            <HomeActionTile
              href="/writing?tab=write-now"
              title="Free writing"
              subtitle="Write without a prompt"
              icon={
                <SquarePen className="h-4 w-4" strokeWidth={2} aria-hidden />
              }
            />
            <HomeActionTile
              href="/writing?tab=written"
              title="Review writing"
              subtitle="Feedback on your writing"
              icon={
                <NotebookText className="h-4 w-4" strokeWidth={2} aria-hidden />
              }
            />
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

        <section
          aria-label="Reading calendar"
          className="rounded-3xl border border-[var(--border-default)] bg-[var(--surface-panel)] p-3 sm:p-4"
        >
          <ReadingYearCalendar
            model={readingCalendar}
            showUpSummary={showUpSummary}
          />
        </section>
      </div>
    </>
  );
}
