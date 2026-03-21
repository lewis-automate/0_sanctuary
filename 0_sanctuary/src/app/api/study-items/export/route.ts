import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function escapeCsvCell(value: string | null | undefined): string {
  const s = value ?? "";
  if (/[",\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

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
    .select("vocab, translation, example_sentences, definition")
    .eq("user_id", user.id)
    .order("date_added", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const header = [
    "vocab",
    "translation",
    "example sentence",
    "definition",
  ].join(",");

  const rows = (data ?? []).map((row) =>
    [
      escapeCsvCell(row.vocab),
      escapeCsvCell(row.translation),
      escapeCsvCell(row.example_sentences),
      escapeCsvCell(row.definition),
    ].join(","),
  );

  const csv = `\uFEFF${[header, ...rows].join("\r\n")}`;

  const filename = `vocab-export-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
