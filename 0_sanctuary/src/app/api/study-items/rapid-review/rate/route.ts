import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const RATINGS = ["hard", "good", "easy"] as const;
type Rating = (typeof RATINGS)[number];

const DELTA: Record<Rating, number> = {
  hard: -14,
  good: 6,
  easy: 14,
};

function isRating(v: unknown): v is Rating {
  return typeof v === "string" && (RATINGS as readonly string[]).includes(v);
}

export async function POST(req: Request) {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const id =
    body && typeof body === "object" && "id" in body && typeof body.id === "string"
      ? body.id
      : null;
  const rating =
    body && typeof body === "object" && "rating" in body ? body.rating : null;

  if (!id?.trim()) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }
  if (!isRating(rating)) {
    return NextResponse.json({ error: "Invalid rating" }, { status: 400 });
  }

  const { data: row, error: fetchError } = await supabase
    .from("study_items")
    .select("mastery_score")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }
  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const raw = row.mastery_score as unknown;
  const current =
    typeof raw === "number" && Number.isFinite(raw)
      ? raw
      : typeof raw === "string" && Number.isFinite(parseFloat(raw))
        ? parseFloat(raw)
        : 0;
  const next = Math.max(0, Math.min(100, current + DELTA[rating]));
  const last_used = new Date().toISOString();

  const { error: updateError } = await supabase
    .from("study_items")
    .update({ mastery_score: next, last_used })
    .eq("id", id)
    .eq("user_id", user.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, mastery_score: next });
}
