import { redirect } from "next/navigation";
import { Suspense } from "react";
import { LibraryList } from "./LibraryList";
import type { LibraryItem } from "../_data/library";
import { createClient } from "@/lib/supabase/server";

export async function LibraryPageContent() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: storiesRows }, { data: progressRows }] = await Promise.all([
    supabase
      .from("stories")
      .select("uuid, story_title, word_count, reading_level, creation_date")
      .eq("original_author_id", user.id)
      .order("creation_date", { ascending: false }),
    supabase
      .from("user_progress")
      .select("stories_uuid, reading_date, fun_grade")
      .eq("user_id", user.id)
      .order("reading_date", { ascending: false }),
  ]);

  const latestByStory = new Map<
    string,
    { reading_date: string; fun_grade: number | null }
  >();
  const readCounts = new Map<string, number>();
  for (const p of progressRows ?? []) {
    if (p.stories_uuid && !latestByStory.has(p.stories_uuid)) {
      latestByStory.set(p.stories_uuid, {
        reading_date: p.reading_date,
        fun_grade: p.fun_grade ?? null,
      });
    }
    if (p.stories_uuid) {
      readCounts.set(p.stories_uuid, (readCounts.get(p.stories_uuid) ?? 0) + 1);
    }
  }

  const items: LibraryItem[] = (storiesRows ?? []).map((s) => {
    const progress = latestByStory.get(s.uuid);
    return {
      uuid: s.uuid,
      story_title: s.story_title ?? "Untitled",
      word_count: s.word_count ?? 0,
      reading_level: s.reading_level ?? "",
      creation_date: s.creation_date ?? "",
      reading_date: progress?.reading_date ?? null,
      fun_grade: progress?.fun_grade ?? null,
      read_count: readCounts.get(s.uuid) ?? 0,
    };
  });

  return (
    <Suspense fallback={<p className="mt-6 animate-pulse text-[var(--text-muted)]">Loading…</p>}>
      <LibraryList items={items} />
    </Suspense>
  );
}
