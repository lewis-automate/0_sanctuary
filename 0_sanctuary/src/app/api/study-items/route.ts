import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("study_items")
    .select(
      "id, vocab, example_sentences, definition, translation, date_added, archived, last_used, mastery_score",
    )
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const items = (data ?? []).map((row) => ({
    ...row,
    id: row.id == null ? "" : String(row.id),
  }));

  return NextResponse.json({ items });
}

