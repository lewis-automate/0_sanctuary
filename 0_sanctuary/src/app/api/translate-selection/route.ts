import { NextResponse } from "next/server";
import {
  countReaderSelectionGraphemes,
  MAX_READER_GRAMMAR_SELECTION_GRAPHEMES,
} from "@/lib/reader-selection-limit";
import { languageNameToTranslateCode } from "@/lib/translation-language-codes";
import { getUserLanguagePair } from "@/lib/user-languages";
import { createClient } from "@/lib/supabase/server";

function decodeTranslationHtml(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, code) =>
      String.fromCharCode(Number.parseInt(code, 10)),
    );
}

type Body = {
  text?: string;
  /** Story language name; used as translate source when set. */
  sourceLanguage?: string;
};

type TranslateV2Response = {
  data?: {
    translations?: Array<{ translatedText?: string }>;
  };
  error?: { message?: string; code?: number };
};

export async function POST(request: Request) {
  const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "Translation is not configured (missing GOOGLE_TRANSLATE_API_KEY).",
      },
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

  if (!nativeLanguage.trim()) {
    return NextResponse.json(
      {
        error: "Set your native language in Settings before using Translate.",
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
  if (!text) {
    return NextResponse.json({ error: "Missing text" }, { status: 400 });
  }

  if (
    countReaderSelectionGraphemes(text) >
    MAX_READER_GRAMMAR_SELECTION_GRAPHEMES
  ) {
    return NextResponse.json(
      {
        error: `Selection is too long (max ${MAX_READER_GRAMMAR_SELECTION_GRAPHEMES} characters). Shorten the highlight.`,
      },
      { status: 400 },
    );
  }

  const targetCode = languageNameToTranslateCode(nativeLanguage);
  if (!targetCode) {
    return NextResponse.json(
      {
        error:
          "Could not map your native language to a translation code. Try a preset language in Settings.",
      },
      { status: 400 },
    );
  }

  const sourceLanguageName =
    typeof body.sourceLanguage === "string" && body.sourceLanguage.trim()
      ? body.sourceLanguage.trim()
      : targetLanguage;
  const sourceCode = sourceLanguageName
    ? languageNameToTranslateCode(sourceLanguageName)
    : null;

  const payload: Record<string, string | string[]> = {
    q: text,
    target: targetCode,
    format: "text",
  };
  if (sourceCode) {
    payload.source = sourceCode;
  }

  try {
    const res = await fetch(
      `https://translation.googleapis.com/language/translate/v2?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );

    const data = (await res.json()) as TranslateV2Response;
    if (!res.ok) {
      const msg =
        data.error?.message ??
        (typeof data === "object" && data !== null && "error" in data
          ? String((data as { error: unknown }).error)
          : "Translation failed");
      return NextResponse.json({ error: msg }, { status: res.status });
    }

    const raw = data.data?.translations?.[0]?.translatedText?.trim();
    if (!raw) {
      return NextResponse.json(
        { error: "No translation returned" },
        { status: 502 },
      );
    }

    return NextResponse.json({ translation: decodeTranslationHtml(raw) });
  } catch {
    return NextResponse.json(
      { error: "Could not reach translation service" },
      { status: 502 },
    );
  }
}
