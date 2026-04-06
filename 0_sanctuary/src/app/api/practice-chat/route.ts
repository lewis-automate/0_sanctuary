import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { isSafeFeedbackIdParam } from "@/lib/feedback-id-param";
import {
  buildPracticeSystemInstruction,
  formatFeedbackStudyBlock,
} from "@/lib/practice-tutor-prompt";
import { getUserLanguagePair } from "@/lib/user-languages";
import {
  MAX_USER_PRACTICE_CHARS,
  MAX_USER_PRACTICE_MESSAGES,
} from "@/lib/practice-user-message-limit";
import { createClient } from "@/lib/supabase/server";

const MODEL = "gemini-2.5-flash";
const MAX_MESSAGES = 40;
const MAX_MESSAGE_CHARS = 8000;
const BOOTSTRAP_USER_TEXT = "Please begin the practice session now.";

type ChatMessage = { role: "user" | "assistant"; content: string };

type Body = {
  feedbackId?: string;
  messages?: ChatMessage[];
};

function clampMessage(text: string): string {
  const t = text.trim();
  if (t.length <= MAX_MESSAGE_CHARS) return t;
  return `${t.slice(0, MAX_MESSAGE_CHARS - 1).trim()}…`;
}

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Practice chat is not configured (missing GEMINI_API_KEY)." },
      { status: 500 },
    );
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const feedbackId = typeof body.feedbackId === "string" ? body.feedbackId.trim() : "";
  if (!feedbackId || !isSafeFeedbackIdParam(feedbackId)) {
    return NextResponse.json({ error: "Invalid feedbackId" }, { status: 400 });
  }

  const rawMessages = Array.isArray(body.messages) ? body.messages : [];
  if (rawMessages.length > MAX_MESSAGES) {
    return NextResponse.json(
      { error: `At most ${MAX_MESSAGES} messages allowed` },
      { status: 400 },
    );
  }

  const clientUserTurns = rawMessages.filter((m) => m.role === "user").length;
  if (clientUserTurns > MAX_USER_PRACTICE_MESSAGES) {
    return NextResponse.json(
      {
        error: `At most ${MAX_USER_PRACTICE_MESSAGES} of your messages per practice session.`,
        code: "USER_MESSAGE_LIMIT",
      },
      { status: 400 },
    );
  }

  for (const m of rawMessages) {
    if (m.role !== "user" && m.role !== "assistant") {
      return NextResponse.json({ error: "Invalid message role" }, { status: 400 });
    }
    if (typeof m.content !== "string") {
      return NextResponse.json({ error: "Invalid message content" }, { status: 400 });
    }
    if (m.role === "user" && m.content.trim().length > MAX_USER_PRACTICE_CHARS) {
      return NextResponse.json(
        {
          error: `Each message must be at most ${MAX_USER_PRACTICE_CHARS} characters.`,
          code: "USER_MESSAGE_TOO_LONG",
        },
        { status: 400 },
      );
    }
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: row, error: rowError } = await supabase
    .from("feedback")
    .select(
      "id, raw_input, alternate_version, feedback, focus_point, user_id",
    )
    .eq("id", feedbackId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (rowError) {
    return NextResponse.json({ error: rowError.message }, { status: 500 });
  }
  if (!row) {
    return NextResponse.json({ error: "Feedback not found" }, { status: 404 });
  }

  const { targetLanguage, nativeLanguage } = await getUserLanguagePair(
    supabase,
    user.id,
  );
  if (!targetLanguage.trim() || !nativeLanguage.trim()) {
    return NextResponse.json(
      {
        error: "Set target and native language in Settings before using Practice.",
        code: "LANGUAGES_REQUIRED",
      },
      { status: 400 },
    );
  }

  const studyBlock = formatFeedbackStudyBlock({
    raw_input: String(row.raw_input ?? ""),
    alternate_version:
      row.alternate_version == null ? null : String(row.alternate_version),
    feedback: row.feedback == null ? null : String(row.feedback),
    focus_point: row.focus_point == null ? null : String(row.focus_point),
  });

  const systemInstruction = buildPracticeSystemInstruction(
    targetLanguage.trim(),
    nativeLanguage.trim(),
    studyBlock,
  );

  let messages: ChatMessage[] = rawMessages.map((m) => ({
    role: m.role,
    content: clampMessage(m.content),
  }));

  if (messages.length === 0) {
    messages = [{ role: "user", content: BOOTSTRAP_USER_TEXT }];
  } else if (messages[messages.length - 1].role !== "user") {
    return NextResponse.json(
      { error: "Last message must be from the user" },
      { status: 400 },
    );
  }

  const lastUserText = messages[messages.length - 1].content;
  const prior = messages.slice(0, -1);

  /** Gemini chat history must start with `user`. Client only stores the opening tutor reply. */
  const history: { role: "user" | "model"; parts: { text: string }[] }[] = [];
  if (prior.length > 0 && prior[0].role === "assistant") {
    history.push({
      role: "user",
      parts: [{ text: BOOTSTRAP_USER_TEXT }],
    });
  }
  for (const m of prior) {
    history.push({
      role: m.role === "user" ? "user" : "model",
      parts: [{ text: m.content }],
    });
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: MODEL,
      systemInstruction,
      generationConfig: {
        maxOutputTokens: 2048,
        temperature: 0.4,
      },
    });

    const chat = model.startChat({ history });
    const result = await chat.sendMessage(lastUserText);
    const reply = result.response.text().trim();

    if (!reply) {
      return NextResponse.json(
        { error: "Empty response from tutor. Try again." },
        { status: 502 },
      );
    }

    return NextResponse.json({ reply });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Practice chat request failed";
    console.error("[practice-chat]", message);
    return NextResponse.json(
      { error: message.replace(/\bAIza\S+/g, "[redacted]") },
      { status: 502 },
    );
  }
}
