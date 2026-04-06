import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { NextResponse } from "next/server";
import {
  extractJsonObjectStringField,
  truncatePromptContext,
} from "@/lib/extract-json-string-field";
import {
  countReaderSelectionGraphemes,
  MAX_READER_CONTEXT_CHARS,
  MAX_READER_TRANSLATE_SELECTION_GRAPHEMES,
} from "@/lib/reader-selection-limit";
import { getUserLanguagePair } from "@/lib/user-languages";
import { createClient } from "@/lib/supabase/server";

type Body = {
  text?: string;
  context?: string;
};

/** Pull string values when JSON.parse fails (truncated output, extra prose). */
function extractJsonStringFields(raw: string): { translation: string; synonym: string } {
  const pick = (field: string) => {
    const m = raw.match(
      new RegExp(`"${field}"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"`, "s"),
    );
    if (!m?.[1]) return "";
    try {
      return JSON.parse('"' + m[1] + '"') as string;
    } catch {
      return "";
    }
  };
  return { translation: pick("translation").trim(), synonym: pick("synonym").trim() };
}

function parseTranslationJson(raw: string): { translation: string; synonym: string } {
  let s = raw.trim();
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) s = fence[1].trim();
  const tryParse = (json: string) => {
    const o = JSON.parse(json) as { translation?: unknown; synonym?: unknown };
    const translation =
      typeof o.translation === "string" ? o.translation.trim() : "";
    const synonym = typeof o.synonym === "string" ? o.synonym.trim() : "";
    if (translation) return { translation, synonym };
    return null;
  };
  try {
    const direct = tryParse(s);
    if (direct) return direct;
  } catch {
    /* fall through */
  }
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start !== -1 && end > start) {
    try {
      const nested = tryParse(s.slice(start, end + 1));
      if (nested) return nested;
    } catch {
      /* fall through */
    }
  }
  const extracted = extractJsonStringFields(s);
  if (extracted.translation) return extracted;

  const looseT = extractJsonObjectStringField(s, "translation");
  if (looseT) {
    return {
      translation: looseT,
      synonym: extractJsonObjectStringField(s, "synonym"),
    };
  }

  // Never treat JSON-looking garbage as the translation (truncated model output).
  const looksLikeJsonObject = /^\s*\{/.test(s);
  if (looksLikeJsonObject) {
    return { translation: "", synonym: "" };
  }
  if (s) return { translation: s, synonym: "" };
  return { translation: "", synonym: "" };
}

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Translation is not configured (missing GEMINI_API_KEY)." },
      { status: 500 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { targetLanguage, nativeLanguage } = await getUserLanguagePair(
    supabase,
    user.id,
  );

  if (!targetLanguage.trim() || !nativeLanguage.trim()) {
    return NextResponse.json(
      {
        error:
          "Set target and native language in Settings before using translate.",
      },
      { status: 400 },
    );
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const text = typeof body.text === "string" ? body.text.trim() : "";
  let context =
    typeof body.context === "string" ? body.context.trim() : "";
  context = truncatePromptContext(context, MAX_READER_CONTEXT_CHARS);

  if (!text) {
    return NextResponse.json({ error: "Missing text" }, { status: 400 });
  }

  if (
    countReaderSelectionGraphemes(text) >
    MAX_READER_TRANSLATE_SELECTION_GRAPHEMES
  ) {
    return NextResponse.json(
      {
        error: `Selection is too long (max ${MAX_READER_TRANSLATE_SELECTION_GRAPHEMES} characters). Shorten the highlight.`,
      },
      { status: 400 },
    );
  }

  const longHighlight = countReaderSelectionGraphemes(text) > 60;
  const prompt = `Translate the highlighted text from ${targetLanguage} to ${nativeLanguage}.

Highlighted text:
${text}

Surrounding context:
${context || "(none)"}

Rules:
- translation: natural translation into ${nativeLanguage}. The highlight may be a single word, a phrase, or a full sentence—translate the whole selection naturally.
- synonym: two alternatives in ${targetLanguage} only (the language being learned). Format exactly as: word1; word2 (semicolon and space between).
${longHighlight ? `- Because the highlight can be long, the two "synonym" items should be short—two salient words or brief phrases from the same meaning space, not two full rewritten sentences.` : `- Each synonym is a single word or very short phrase that could replace the highlighted text in this context.`}

No conversational filler: Put only the actual translation and synonyms in those fields. Do not add chat, preambles ("Sure!", "Here is…"), apologies, meta-commentary, or any text that is not the translation/synonyms themselves.`;

  try {
    const t0 = Date.now();
    const genAI = new GoogleGenerativeAI(apiKey);
    // gemini-2.5-flash is tuned for low latency. Gemini 3 preview models often spend
    // extra time on internal "thinking", which can push simple calls toward ~5–15s.
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            translation: { type: SchemaType.STRING },
            synonym: { type: SchemaType.STRING },
          },
          required: ["translation"],
        },
        maxOutputTokens: 8192,
        temperature: 0.2,
      },
    });
    const result = await model.generateContent(prompt);
    if (process.env.NODE_ENV === "development") {
      console.log("[translate-selection] gemini round-trip ms:", Date.now() - t0);
    }
    const raw = result.response.text().trim();
    const finishReason = result.response.candidates?.[0]?.finishReason;
    if (finishReason === "MAX_TOKENS") {
      console.warn("[translate-selection] hit MAX_TOKENS; increase maxOutputTokens?");
    }
    const parsed = parseTranslationJson(raw);

    if (!parsed.translation) {
      return NextResponse.json(
        {
          error:
            "Translation response was incomplete. Please try again, or shorten the selection.",
        },
        { status: 502 },
      );
    }

    return NextResponse.json({
      translation: parsed.translation,
      synonym: parsed.synonym,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Translation request failed";
    console.error("[translate-selection]", message);
    return NextResponse.json(
      { error: message.replace(/\bAIza\S+/g, "[redacted]") },
      { status: 502 },
    );
  }
}
