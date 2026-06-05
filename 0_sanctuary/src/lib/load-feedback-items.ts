import type { SupabaseClient } from "@supabase/supabase-js";

export type FeedbackListItem = {
  id: string;
  raw_input: string;
  alternate_version: string | null;
  feedback: string | null;
  focus_point: string | null;
  reviewed: boolean;
};

export async function loadFeedbackItems(
  supabase: SupabaseClient,
  userId: string,
): Promise<FeedbackListItem[]> {
  const { data, error } = await supabase
    .from("feedback")
    .select(
      "id, raw_input, alternate_version, feedback, focus_point, date_added, reviewed",
    )
    .eq("user_id", userId)
    .order("date_added", { ascending: false });

  if (error) {
    console.error("[loadFeedbackItems]", error.message);
    return [];
  }

  return (data ?? []).map((row) => ({
    id: String(row.id),
    raw_input: row.raw_input ?? "",
    alternate_version: row.alternate_version ?? null,
    feedback: row.feedback ?? null,
    focus_point: row.focus_point ?? null,
    reviewed: !!row.reviewed,
  }));
}

export async function countUnreviewedFeedback(
  supabase: SupabaseClient,
  userId: string,
): Promise<number> {
  const { count, error } = await supabase
    .from("feedback")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("reviewed", false);

  if (error) {
    console.error("[countUnreviewedFeedback]", error.message);
    return 0;
  }

  return count ?? 0;
}
