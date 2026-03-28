import {
  GoogleGenerativeAI,
  SchemaType,
  type Schema,
} from "@google/generative-ai";
import { NextResponse } from "next/server";
import { buildFiveSentencesUserPrompt } from "@/lib/five-sentences-prompt";
import { getUserLanguagePair } from "@/lib/user-languages";
import { createClient } from "@/lib/supabase/server";

const MODEL = "gemini-2.5-flash";

const SELECT_FIELDS =
  "id, vocab, example_sentences, definition, translation, last_used, mastery_score, frequency, date_added";

type ParsedPayload = {
  explanation: string;
  dissected: string;
  sentences: { sentence: string; reference: string }[];
};

type Body = {
  studyItemId?: string;
};

function responseSchema(): Schema {
  return {
    type: SchemaType.OBJECT,
    properties: {
      explanation: { type: SchemaType.STRING },
      dissected: { type: SchemaType.STRING },
      sentences: {
        type: SchemaType.ARRAY,
        minItems: 5,
        maxItems: 5,
        items: {
          type: SchemaType.OBJECT,
          properties: {
            sentence: { type: SchemaType.STRING },
            reference: { type: SchemaType.STRING },
          },
          required: ["sentence", "reference"],
        },
      },
    },
    required: ["explanation", "dissected", "sentences"],
  };
}

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Hyper focus is not configured (missing GEMINI_API_KEY)." },
      { status: 500 },
    );
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    body = {};
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let studyItemId =
    typeof body.studyItemId === "string" ? body.studyItemId.trim() : "";

  type StudyRow = {
    id: string;
    vocab: string;
  };

  let row: StudyRow | null = null;

  if (studyItemId) {
    const { data, error } = await supabase
      .from("study_items")
      .select("id, vocab")
      .eq("user_id", user.id)
      .eq("id", studyItemId)
      .maybeSingle();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    row = data as StudyRow | null;
  } else {
    const { data, error } = await supabase
      .from("study_items")
      .select("id, vocab")
      .eq("user_id", user.id)
      .order("last_used", { ascending: true, nullsFirst: true })
      .order("mastery_score", { ascending: true })
      .order("frequency", { ascending: false })
      .order("date_added", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    row = data as StudyRow | null;
  }

  if (!row?.vocab?.trim()) {
    return NextResponse.json(
      { error: "No saved collocation found for this account." },
      { status: 404 },
    );
  }

  studyItemId = row.id;
  const vocab = row.vocab.trim();

  const { targetLanguage, nativeLanguage } = await getUserLanguagePair(
    supabase,
    user.id,
  );
  if (!targetLanguage.trim() || !nativeLanguage.trim()) {
    return NextResponse.json(
      {
        error: "Set target and native language in Settings first.",
        code: "LANGUAGES_REQUIRED",
      },
      { status: 400 },
    );
  }

  const userPrompt = buildFiveSentencesUserPrompt({
    targetLanguage: targetLanguage.trim(),
    nativeLanguage: nativeLanguage.trim(),
    vocab,
  });

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: MODEL,
      generationConfig: {
        temperature: 0.35,
        maxOutputTokens: 4096,
        responseMimeType: "application/json",
        responseSchema: responseSchema(),
      },
    });

    const result = await model.generateContent(userPrompt);
    const text = result.response.text().trim();
    if (!text) {
      return NextResponse.json(
        { error: "Empty response from model." },
        { status: 502 },
      );
    }

    const parsed = JSON.parse(text) as ParsedPayload;
    if (
      !parsed.explanation ||
      !parsed.dissected ||
      !Array.isArray(parsed.sentences)
    ) {
      return NextResponse.json(
        { error: "Invalid JSON shape from model." },
        { status: 502 },
      );
    }
    if (parsed.sentences.length !== 5) {
      return NextResponse.json(
        { error: `Expected 5 sentences, got ${parsed.sentences.length}.` },
        { status: 502 },
      );
    }

    return NextResponse.json({
      studyItemId,
      vocab,
      explanation: String(parsed.explanation).trim(),
      dissected: String(parsed.dissected).trim(),
      sentences: parsed.sentences.map((s) => ({
        sentence: String(s.sentence ?? "").trim(),
        reference: String(s.reference ?? "").trim(),
      })),
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Hyper focus request failed";
    console.error("[hyper-focus]", message);
    return NextResponse.json(
      { error: message.replace(/\bAIza\S+/g, "[redacted]") },
      { status: 502 },
    );
  }
}
