import type { SupabaseClient } from "@supabase/supabase-js";

export type StudyListItem = {
  id: string;
  vocab: string;
  example_sentences: string | null;
  definition: string | null;
  translation: string | null;
  archived: boolean | null;
  date_added: string | null;
  last_used: string | null;
  mastery_score: unknown;
};

export async function loadStudyItems(
  supabase: SupabaseClient,
  userId: string,
): Promise<StudyListItem[]> {
  const { data, error } = await supabase
    .from("study_items")
    .select(
      "id, vocab, example_sentences, definition, translation, archived, date_added, last_used, mastery_score",
    )
    .eq("user_id", userId)
    .order("date_added", { ascending: false });

  if (error) {
    console.error("[loadStudyItems]", error.message);
    return [];
  }

  return (data ?? []).map((row) => ({
    id: String(row.id),
    vocab: row.vocab ?? "",
    example_sentences: row.example_sentences ?? null,
    definition: row.definition ?? null,
    translation: row.translation ?? null,
    archived: row.archived ?? null,
    date_added: row.date_added ?? null,
    last_used: row.last_used ?? null,
    mastery_score: row.mastery_score ?? null,
  }));
}
