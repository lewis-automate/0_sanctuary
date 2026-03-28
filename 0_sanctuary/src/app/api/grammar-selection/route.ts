import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { NextResponse } from "next/server";
import {
  extractJsonObjectStringField,
  truncatePromptContext,
} from "@/lib/extract-json-string-field";
import {
  countReaderSelectionGraphemes,
  MAX_READER_SELECTION_GRAPHEMES,
} from "@/lib/reader-selection-limit";
import { getUserLanguagePair } from "@/lib/user-languages";
import { createClient } from "@/lib/supabase/server";

const MAX_EXPLANATION_CHARS = 480;
const MAX_CONTEXT_CHARS = 5000;

type Body = {
  text?: string;
  context?: string;
};

function parseExplanationJson(raw: string): string {
  let s = raw.trim();
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) s = fence[1].trim();

  const tryParse = (json: string): string | null => {
    const o = JSON.parse(json) as { explanation?: unknown };
    if (typeof o.explanation === "string" && o.explanation.trim()) {
      return o.explanation.trim();
    }
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

  const m = s.match(/"explanation"\s*:\s*"((?:[^"\\\\]|\\\\.)*)"/s);
  if (m?.[1]) {
    try {
      return JSON.parse('"' + m[1] + '"') as string;
    } catch {
      return m[1]
        .replace(/\\n/g, "\n")
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, "\\");
    }
  }

  const loose = extractJsonObjectStringField(s, "explanation");
  if (loose) return loose;

  return "";
}

function clampExplanation(text: string): string {
  const t = text.trim();
  if (t.length <= MAX_EXPLANATION_CHARS) return t;
  return `${t.slice(0, MAX_EXPLANATION_CHARS - 1).trim()}…`;
}

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Grammar help is not configured (missing GEMINI_API_KEY)." },
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
          "Set target and native language in Settings before using grammar help.",
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
  context = truncatePromptContext(context, MAX_CONTEXT_CHARS);

  if (!text) {
    return NextResponse.json({ error: "Missing text" }, { status: 400 });
  }

  if (countReaderSelectionGraphemes(text) > MAX_READER_SELECTION_GRAPHEMES) {
    return NextResponse.json(
      {
        error: `Selection is too long (max ${MAX_READER_SELECTION_GRAPHEMES} characters). Shorten the highlight.`,
      },
      { status: 400 },
    );
  }

  const prompt = `You help someone learning ${targetLanguage} while they read authentic text.

The passage is written in ${targetLanguage}. The learner's native language is ${nativeLanguage}.

Highlighted phrase (in ${targetLanguage}):
${text}

Nearby context:
${context || "(none)"}

Task: In ${nativeLanguage} only, give a BRIEF grammar note that helps the reader understand this phrase—e.g. why this word form is used, how the clause fits together, or one relevant rule. Do not re-translate the whole passage.

No conversational filler (critical): The "explanation" value must be ONLY the grammar note itself. Do not start with phrases like "Sure", "Here is", "Below", "I hope", or any chat, preamble, apology, or meta-commentary about the task or JSON. No greetings, sign-offs, or "let me know".

Strict rules:
- Write entirely in ${nativeLanguage}.
- At most ${MAX_EXPLANATION_CHARS} characters total in the "explanation" field (about 2–4 short sentences).
- If the highlight is a full sentence, focus on one or two grammatical points only.

Output format (critical): Your entire reply must be ONLY the JSON object required by the API schema. Do not write introductions or the words "JSON" or markdown. No code fences.`;

  try {
    const t0 = Date.now();
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            explanation: { type: SchemaType.STRING },
          },
          required: ["explanation"],
        },
        maxOutputTokens: 1024,
        temperature: 0.25,
      },
    });
    const result = await model.generateContent(prompt);
    if (process.env.NODE_ENV === "development") {
      console.log("[grammar-selection] gemini round-trip ms:", Date.now() - t0);
    }
    const raw = result.response.text().trim();
    const finishReason = result.response.candidates?.[0]?.finishReason;
    if (finishReason === "MAX_TOKENS") {
      console.warn("[grammar-selection] MAX_TOKENS (partial JSON may be recovered)");
    }
    let explanation = parseExplanationJson(raw);
    explanation = clampExplanation(explanation);

    if (!explanation) {
      return NextResponse.json(
        {
          error:
            "Could not produce a grammar note. Try again or shorten the selection.",
        },
        { status: 502 },
      );
    }

    return NextResponse.json({ explanation });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Grammar request failed";
    console.error("[grammar-selection]", message);
    return NextResponse.json(
      { error: message.replace(/\bAIza\S+/g, "[redacted]") },
      { status: 502 },
    );
  }
}
