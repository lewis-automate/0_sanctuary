import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const SELECT_FIELDS =
  "id, vocab, example_sentences, definition, translation, last_used, mastery_score, frequency, date_added";

/** Up to 10 items: least-recently used first, then lowest mastery, then highest frequency, then oldest created. */
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
    .select(SELECT_FIELDS)
    .eq("user_id", user.id)
    .order("last_used", { ascending: true, nullsFirst: true })
    .order("mastery_score", { ascending: true })
    .order("frequency", { ascending: false })
    .order("date_added", { ascending: true })
    .limit(10);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ items: data ?? [] });
}
