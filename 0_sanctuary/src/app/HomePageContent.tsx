import type { SupabaseClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import type { ReadingCalendarModel } from "./_components/ReadingYearCalendar";
import { HomeDashboard } from "./HomeDashboard";
import type { HomeStats } from "./HomeDashboard";
import { resolveUserDisplayName } from "@/lib/resolve-user-display-name";
import {
  buildShowUpEncouragement,
  type ShowUpEncouragement,
} from "@/lib/show-up-encouragement";
import {
  addCalendarMonths,
  formatDateKeyInTimeZone,
  getCalendarMonthInTimeZone,
  getCalendarYearInTimeZone,
  getUtcBoundsForMonth,
  getUserTimezone,
} from "@/lib/user-timezone";
import { createClient } from "@/lib/supabase/server";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

const VALID_HOME_TABS = new Set(["main", "activity"]);
/** Older bookmarks normalize to Main on the client; SSR default uses this too. */
const LEGACY_HOME_TAB_TO_MAIN = new Set(["shortcuts", "progress"]);

type PageProps = {
  searchParams?: Promise<{ tab?: string }> | { tab?: string };
};

async function loadHomeStats(
  supabase: SupabaseClient,
  userId: string,
): Promise<{
  quickReadHref: string;
  stats: HomeStats;
  readingCalendar: ReadingCalendarModel;
  showUpEncouragement: ShowUpEncouragement | null;
}> {
  const timeZone = await getUserTimezone(supabase, userId);
  const now = new Date();
  const todayYear = getCalendarYearInTimeZone(now, timeZone);
  const todayMonth = getCalendarMonthInTimeZone(now, timeZone);
  const todayDateKey = formatDateKeyInTimeZone(now, timeZone) ?? "";
  const dayOfMonth = Number(todayDateKey.split("-")[2]);
  const eligibleDaysSoFar =
    Number.isFinite(dayOfMonth) && dayOfMonth >= 1 ? dayOfMonth : 1;

  const { startUtc: monthStartUtc, endUtc: monthEndUtc } =
    getUtcBoundsForMonth(todayYear, todayMonth, timeZone);

  /** Earliest month in the navigator (product minimum). */
  const minYear = 2026;
  const minMonth = 1;
  /** Up to 36 months ahead of “today” in the user’s timezone. */
  const maxNav = addCalendarMonths(todayYear, todayMonth, 36);

  let initialYear = todayYear;
  let initialMonth = todayMonth;
  const minOrd = minYear * 12 + minMonth - 1;
  const maxOrd = maxNav.year * 12 + maxNav.month - 1;
  const curOrd = todayYear * 12 + todayMonth - 1;
  const clamped = Math.max(minOrd, Math.min(maxOrd, curOrd));
  initialYear = Math.floor(clamped / 12);
  initialMonth = (clamped % 12) + 1;

  const cutoffMs = Date.now() - THIRTY_DAYS_MS;
  const cutoffIso = new Date(cutoffMs).toISOString();

  const [
    { data: progressRows },
    { data: monthProgressRows },
    { count: savedVocabTotal },
    { count: savedVocab30d },
    { data: authorStoriesRows },
  ] = await Promise.all([
    supabase
      .from("user_progress")
      .select("stories_uuid, reading_date")
      .eq("user_id", userId),
    supabase
      .from("user_progress")
      .select("reading_date")
      .eq("user_id", userId)
      .gte("reading_date", monthStartUtc)
      .lt("reading_date", monthEndUtc),
    supabase
      .from("study_items")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId),
    supabase
      .from("study_items")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("date_added", cutoffIso),
    supabase
      .from("stories")
      .select("uuid")
      .eq("original_author_id", userId)
      .order("creation_date", { ascending: false }),
  ]);

  const rows = progressRows ?? [];

  const readCountsByStory = new Map<string, number>();
  for (const p of rows) {
    if (p.stories_uuid) {
      readCountsByStory.set(
        p.stories_uuid,
        (readCountsByStory.get(p.stories_uuid) ?? 0) + 1,
      );
    }
  }

  let quickReadHref: string = "/library";
  for (const s of authorStoriesRows ?? []) {
    if ((readCountsByStory.get(s.uuid) ?? 0) === 0) {
      quickReadHref = `/reader?story=${encodeURIComponent(s.uuid)}`;
      break;
    }
  }
  const storyIds = Array.from(
    new Set(rows.map((p) => p.stories_uuid).filter(Boolean)),
  ) as string[];

  const wordCountByStory = new Map<string, number>();
  if (storyIds.length > 0) {
    const { data: stories } = await supabase
      .from("stories")
      .select("uuid, word_count")
      .in("uuid", storyIds);
    for (const s of stories ?? []) {
      wordCountByStory.set(
        s.uuid,
        typeof s.word_count === "number" ? s.word_count : 0,
      );
    }
  }

  let wordsReadAllTime = 0;
  let wordsRead30d = 0;
  let completedReads30d = 0;

  for (const p of rows) {
    const wc = p.stories_uuid
      ? (wordCountByStory.get(p.stories_uuid) ?? 0)
      : 0;
    wordsReadAllTime += wc;
    const t = p.reading_date ? new Date(p.reading_date).getTime() : NaN;
    if (!Number.isNaN(t) && t >= cutoffMs) {
      wordsRead30d += wc;
      completedReads30d += 1;
    }
  }

  const completedReadsAllTime = rows.length;
  const savedWordsTotal = savedVocabTotal ?? 0;
  const savedWords30d = savedVocab30d ?? 0;

  const stats: HomeStats = {
    wordsRead30d,
    wordsReadAllTime,
    completedReads30d,
    completedReadsAllTime,
    savedWords30d,
    savedWordsTotal,
  };

  const activeDaysThisMonth = new Set<string>();
  for (const row of monthProgressRows ?? []) {
    if (!row.reading_date) continue;
    const key = formatDateKeyInTimeZone(row.reading_date, timeZone);
    if (!key || key > todayDateKey) continue;
    activeDaysThisMonth.add(key);
  }
  const showUpEncouragement = buildShowUpEncouragement(
    activeDaysThisMonth.size,
    eligibleDaysSoFar,
    todayYear,
    todayMonth,
    userId,
  );

  return {
    quickReadHref,
    stats,
    showUpEncouragement,
    readingCalendar: {
      todayDateKey,
      initialYear,
      initialMonth,
      minYear,
      minMonth,
      maxYear: maxNav.year,
      maxMonth: maxNav.month,
    },
  };
}

export async function HomePageContent({ searchParams }: PageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const params =
    searchParams instanceof Promise ? await searchParams : searchParams ?? {};
  const raw = typeof params.tab === "string" ? params.tab : "";
  const initialTab = VALID_HOME_TABS.has(raw)
    ? (raw as "main" | "activity")
    : LEGACY_HOME_TAB_TO_MAIN.has(raw)
      ? ("main" as const)
      : undefined;

  const [welcomeName, { quickReadHref, stats, readingCalendar, showUpEncouragement }] =
    await Promise.all([
      resolveUserDisplayName(supabase, user),
      loadHomeStats(supabase, user.id),
    ]);

  return (
    <HomeDashboard
      welcomeName={welcomeName}
      initialTab={initialTab}
      quickReadHref={quickReadHref}
      stats={stats}
      readingCalendar={readingCalendar}
      showUpEncouragement={showUpEncouragement}
    />
  );
}
