"use server";

import { createClient } from "@/lib/supabase/server";

export type StoryGenPayload = {
  topic?: string;
  tone?: string;
  difficulty?: string;
  word_count?: string;
};

export async function queueStoryGeneration(payload: StoryGenPayload): Promise<
  | { ok: true; jobId: string }
  | { ok: false; error: string }
> {
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
      event_type: "story_gen",
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
  const webhookPayload = { job_id: row.id, user_id: user.id, event_type: "story_gen" };

  console.log("[queueStoryGeneration] NEXT_PUBLIC_N8N_MAIN_WEBHOOK_URL set:", !!n8nUrl);
  if (n8nUrl) {
    console.log("[queueStoryGeneration] Webhook URL (first 60 chars):", n8nUrl.slice(0, 60) + (n8nUrl.length > 60 ? "…" : ""));
    console.log("[queueStoryGeneration] Sending payload:", webhookPayload);
    try {
      const res = await fetch(n8nUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(webhookPayload),
      });
      const resText = await res.text();
      console.log("[queueStoryGeneration] Webhook response status:", res.status, "body:", resText.slice(0, 200));
      if (!res.ok) {
        console.error("[queueStoryGeneration] n8n webhook failed:", res.status, resText);
      }
    } catch (err) {
      console.error("[queueStoryGeneration] n8n webhook error:", err);
    }
  } else {
    console.log("[queueStoryGeneration] Skipping webhook (NEXT_PUBLIC_N8N_MAIN_WEBHOOK_URL not set)");
  }

  return { ok: true, jobId: row.id };
}
