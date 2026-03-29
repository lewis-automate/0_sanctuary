"use server";

import { createClient } from "@/lib/supabase/server";

const WRITE_NOW_MAX_CHARS = 500;

export type WriteNowSubmitPayload = {
  text: string;
  character_count: number;
  submitted_from_fullscreen: boolean;
};

export async function queueWriteNowSubmission(
  payload: WriteNowSubmitPayload,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Not authenticated" };
  }

  const text = payload.text.trim();
  if (!text) {
    return { ok: false, error: "Nothing to send" };
  }

  const body = {
    text,
    character_count: payload.character_count,
    max_characters: WRITE_NOW_MAX_CHARS,
    submitted_from_fullscreen: payload.submitted_from_fullscreen,
  };

  const { data: row, error: insertError } = await supabase
    .from("activity_queue")
    .insert({
      user_id: user.id,
      event_type: "write_now_submit",
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
        event_type: "write_now_submit",
        ...body,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (res.ok) {
      return { ok: true };
    }
    console.error("[queueWriteNowSubmission] n8n webhook non-2xx:", res.status);
    return { ok: false, error: `Webhook returned ${res.status}` };
  } catch (err) {
    clearTimeout(timeoutId);
    console.error("[queueWriteNowSubmission] n8n webhook error:", err);
    return { ok: true };
  }
}
