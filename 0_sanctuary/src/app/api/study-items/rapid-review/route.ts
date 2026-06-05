import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const SELECT_FIELDS =
  "id, vocab, example_sentences, definition, translation, last_used, mastery_score, frequency, date_added, archived";

type StudyItemRow = {
  id: string;
  vocab: string;
  example_sentences: string | null;
  definition: string | null;
  translation: string | null;
  last_used: string | null;
  mastery_score: unknown;
  frequency: unknown;
  date_added: string | null;
  archived: boolean | null;
};

/** 10 items: 5 normal sort, 3 same filter without mastery, 2 longest since last review. */
export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const base = () => {
    let q = supabase
      .from("study_items")
      .select(SELECT_FIELDS)
      .eq("user_id", user.id)
      .or("archived.is.null,archived.eq.false");
    return q;
  };

  const excludeIds = (q: ReturnType<typeof base>, ids: string[]) => {
    if (ids.length === 0) return q;
    return q.not("id", "in", `(${ids.join(",")})`);
  };

  const selected: StudyItemRow[] = [];
  const selectedIds: string[] = [];

  const phase1 = await excludeIds(base(), selectedIds)
    .order("last_used", { ascending: true, nullsFirst: true })
    .order("mastery_score", { ascending: true })
    .order("frequency", { ascending: false })
    .order("date_added", { ascending: true })
    .limit(5);

  if (phase1.error) {
    return NextResponse.json({ error: phase1.error.message }, { status: 500 });
  }
  for (const row of phase1.data ?? []) {
    selected.push(row as StudyItemRow);
    selectedIds.push(row.id);
  }

  const phase2 = await excludeIds(base(), selectedIds)
    .order("last_used", { ascending: true, nullsFirst: true })
    .order("frequency", { ascending: false })
    .order("date_added", { ascending: true })
    .limit(3);

  if (phase2.error) {
    return NextResponse.json({ error: phase2.error.message }, { status: 500 });
  }
  for (const row of phase2.data ?? []) {
    selected.push(row as StudyItemRow);
    selectedIds.push(row.id);
  }

  const phase3 = await excludeIds(base(), selectedIds)
    .order("last_used", { ascending: true, nullsFirst: true })
    .limit(2);

  if (phase3.error) {
    return NextResponse.json({ error: phase3.error.message }, { status: 500 });
  }
  for (const row of phase3.data ?? []) {
    selected.push(row as StudyItemRow);
  }

  return NextResponse.json({ items: selected });
}
