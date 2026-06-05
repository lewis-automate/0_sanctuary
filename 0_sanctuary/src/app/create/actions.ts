"use server";

import { createClient } from "@/lib/supabase/server";
import type { StoryGenPayload } from "./story-gen-payload";

export type { StoryGenPayload } from "./story-gen-payload";

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

  if (n8nUrl) {
    try {
      const res = await fetch(n8nUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(webhookPayload),
      });
      if (!res.ok) {
        console.error("[queueStoryGeneration] n8n webhook failed:", res.status);
      }
    } catch (err) {
      console.error("[queueStoryGeneration] n8n webhook error:", err);
    }
  }

  return { ok: true, jobId: row.id };
}
