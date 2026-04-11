import { ReaderContent } from "../_components/ReaderContent";
import type { Story } from "../_data/stories";
import { getUserLanguagePair } from "@/lib/user-languages";
import { createClient } from "@/lib/supabase/server";

type PageProps = {
  searchParams?: Promise<{ story?: string }> | { story?: string };
};

export async function ReaderPageContent({ searchParams }: PageProps) {
  const params = searchParams instanceof Promise ? await searchParams : searchParams ?? {};
  const storyId = params.story;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!storyId) {
    const langs = user
      ? await getUserLanguagePair(supabase, user.id)
      : { targetLanguage: "", nativeLanguage: "" };
    return (
      <ReaderContent
        story={null}
        message="Pick a story from the library to read."
        targetLanguage={langs.targetLanguage}
        nativeLanguage={langs.nativeLanguage}
      />
    );
  }

  if (!user) {
    return (
      <ReaderContent
        story={null}
        message="Please sign in."
        targetLanguage=""
        nativeLanguage=""
      />
    );
  }

  const { targetLanguage, nativeLanguage } = await getUserLanguagePair(
    supabase,
    user.id,
  );

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
      targetLanguage={targetLanguage}
      nativeLanguage={nativeLanguage}
    />
  );
}
