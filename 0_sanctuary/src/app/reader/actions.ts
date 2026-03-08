"use server";

import { createClient } from "@/lib/supabase/server";

export type ProgressUpdatePayload = {
  story_id: string;
  saved_vocab: string[];
  thoughts: string;
  difficulty: number | null;
  engagement: number | null;
};

export async function queueProgressUpdate(
  payload: ProgressUpdatePayload,
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
      event_type: "progress_update",
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
        event_type: "progress_update",
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (res.ok) {
      return { ok: true };
    }
    console.error("[queueProgressUpdate] n8n webhook non-2xx:", res.status);
    return { ok: false, error: `Webhook returned ${res.status}` };
  } catch (err) {
    clearTimeout(timeoutId);
    console.error("[queueProgressUpdate] n8n webhook error:", err);
    // Progress is already in the queue; redirect so the user isn't stuck
    return { ok: true };
  }
}
