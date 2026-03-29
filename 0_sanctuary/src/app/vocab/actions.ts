"use server";

import { createClient } from "@/lib/supabase/server";

export type AddVocabSubmitPayload = {
  words: string[];
  word_count: number;
};

export type FeedbackReviewedPayload = {
  feedback_id: string;
  reviewed: boolean;
  focus_point: string | null;
};

export async function queueAddVocabSubmit(
  payload: AddVocabSubmitPayload,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Not authenticated" };
  }

  const words = payload.words.map((w) => w.trim()).filter(Boolean);
  if (!words.length) {
    return { ok: false, error: "No words to save" };
  }

  const body = { words, word_count: words.length };

  const { data: row, error: insertError } = await supabase
    .from("activity_queue")
    .insert({
      user_id: user.id,
      event_type: "add_vocab_submit",
      status: "pending",
      payload: body,
    })
    .select("id")
    .single();

  if (insertError) {
    return { ok: false, error: insertError.message };
  }
  if (!row?.id) {
    return { ok: false, error: "No row returned" };
  }

  const n8nUrl = process.env.NEXT_PUBLIC_N8N_MAIN_WEBHOOK_URL;
  if (!n8nUrl) {
    return { ok: true };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10_000);

  try {
    const res = await fetch(n8nUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        job_id: row.id,
        user_id: user.id,
        event_type: "add_vocab_submit",
        ...body,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (res.ok) {
      return { ok: true };
    }
    console.error("[queueAddVocabSubmit] n8n webhook non-2xx:", res.status);
    return { ok: false, error: `Webhook returned ${res.status}` };
  } catch (err) {
    clearTimeout(timeoutId);
    console.error("[queueAddVocabSubmit] n8n webhook error:", err);
    return { ok: true };
  }
}

export async function queueFeedbackReviewed(
  payload: FeedbackReviewedPayload,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Not authenticated" };
  }

  const { data: row, error: insertError } = await supabase
    .from("activity_queue")
    .insert({
      user_id: user.id,
      event_type: "feedback_reviewed",
      status: "pending",
      payload,
    })
    .select("id")
    .single();

  if (insertError) {
    return { ok: false, error: insertError.message };
  }
  if (!row?.id) {
    return { ok: false, error: "No row returned" };
  }

  const n8nUrl = process.env.NEXT_PUBLIC_N8N_MAIN_WEBHOOK_URL;
  if (!n8nUrl) {
    return { ok: true };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch(n8nUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        job_id: row.id,
        user_id: user.id,
        event_type: "feedback_reviewed",
        ...payload,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (res.ok) {
      return { ok: true };
    }
    console.error("[queueFeedbackReviewed] n8n webhook non-2xx:", res.status);
    return { ok: false, error: `Webhook returned ${res.status}` };
  } catch (err) {
    clearTimeout(timeoutId);
    console.error("[queueFeedbackReviewed] n8n webhook error:", err);
    return { ok: true };
  }
}
