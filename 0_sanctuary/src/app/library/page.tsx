import { redirect } from "next/navigation";
import { FadeIn } from "../_components/FadeIn";
import { LibraryList } from "./LibraryList";
import type { LibraryItem } from "../_data/library";
import { createClient } from "@/lib/supabase/server";

export default async function LibraryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  console.log("[LibraryPage] Auth user:", {
    id: user.id,
    email: user.email,
  });

  const { data: storiesRows } = await supabase
    .from("stories")
    .select("uuid, story_title, word_count, reading_level, creation_date")
    .eq("original_author_id", user.id)
    .order("creation_date", { ascending: false });

  const { data: progressRows } = await supabase
    .from("user_progress")
    .select("stories_uuid, reading_date, fun_grade")
    .eq("user_id", user.id)
    .order("reading_date", { ascending: false });

  console.log("[LibraryPage] Stories:", storiesRows);
  console.log("[LibraryPage] Raw progressRows:", progressRows);

  // Latest progress per story (first row per story due to order)
  const latestByStory = new Map<string, { reading_date: string; fun_grade: number | null }>();
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
    <FadeIn className="mx-auto w-full max-w-prose">
      <header className="mb-3 text-center sm:text-left">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
          Library
        </p>
      </header>
      <LibraryList items={items} />
    </FadeIn>
  );
}

