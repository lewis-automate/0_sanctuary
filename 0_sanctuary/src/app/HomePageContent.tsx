import type { SupabaseClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { HomeDashboard } from "./HomeDashboard";
import type { HomeStats } from "./HomeDashboard";
import { resolveUserDisplayName } from "@/lib/resolve-user-display-name";
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
): Promise<{ quickReadHref: string; stats: HomeStats }> {
  const cutoffMs = Date.now() - THIRTY_DAYS_MS;
  const cutoffIso = new Date(cutoffMs).toISOString();

  const [
    { data: progressRows },
    { count: savedVocabTotal },
    { count: savedVocab30d },
    { data: authorStoriesRows },
  ] = await Promise.all([
    supabase
      .from("user_progress")
      .select("stories_uuid, reading_date")
      .eq("user_id", userId),
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

  return { quickReadHref, stats };
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

  const [welcomeName, { quickReadHref, stats }] = await Promise.all([
    resolveUserDisplayName(supabase, user),
    loadHomeStats(supabase, user.id),
  ]);

  return (
    <HomeDashboard
      welcomeName={welcomeName}
      initialTab={initialTab}
      quickReadHref={quickReadHref}
      stats={stats}
    />
  );
}
