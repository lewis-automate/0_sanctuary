import { ReaderContent } from "../_components/ReaderContent";
import type { Story } from "../_data/stories";
import { createClient } from "@/lib/supabase/server";

type PageProps = {
  searchParams?: Promise<{ story?: string }> | { story?: string };
};

export default async function ReaderPage({ searchParams }: PageProps) {
  const params = searchParams instanceof Promise ? await searchParams : searchParams ?? {};
  const storyId = params.story;

  if (!storyId) {
    return (
      <ReaderContent
        story={null}
        message="Pick a story from the library to read."
      />
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return <ReaderContent story={null} message="Please sign in." />;
  }

  const { data: row } = await supabase
    .from("stories")
    .select("uuid, story_title, word_count, language, reading_level, reading_material")
    .eq("uuid", storyId)
    .eq("original_author_id", user.id)
    .single();

  const story: Story | null = row
    ? {
        id: row.uuid,
        title: row.story_title ?? "Untitled",
        wordCount: row.word_count ?? 0,
        language: row.language ?? "",
        difficulty: row.reading_level ?? "",
        body: row.reading_material ?? "",
      }
    : null;

  return (
    <ReaderContent
      story={story}
      message={story ? undefined : "Story not found."}
    />
  );
}

