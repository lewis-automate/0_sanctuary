import type { SupabaseClient } from "@supabase/supabase-js";

/** First unread story, or library with all stories visible when caught up. */
export async function resolveQuickReadHref(
  supabase: SupabaseClient,
  userId: string,
): Promise<string> {
  const [{ data: progressRows }, { data: authorStoriesRows }] = await Promise.all([
    supabase
      .from("user_progress")
      .select("stories_uuid")
      .eq("user_id", userId),
    supabase
      .from("stories")
      .select("uuid")
      .eq("original_author_id", userId)
      .order("creation_date", { ascending: false }),
  ]);

  const readCounts = new Map<string, number>();
  for (const p of progressRows ?? []) {
    if (p.stories_uuid) {
      readCounts.set(
        p.stories_uuid,
        (readCounts.get(p.stories_uuid) ?? 0) + 1,
      );
    }
  }

  for (const s of authorStoriesRows ?? []) {
    if ((readCounts.get(s.uuid) ?? 0) === 0) {
      return `/reader?story=${encodeURIComponent(s.uuid)}`;
    }
  }

  return "/library?show=all";
}

export function isReaderHref(href: string): boolean {
  return href.startsWith("/reader?story=");
}
