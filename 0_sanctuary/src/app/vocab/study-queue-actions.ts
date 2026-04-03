"use server";

import { createClient } from "@/lib/supabase/server";

export type RapidReviewRatingRow = {
  study_item_id: string;
  vocab: string;
  rating: "hard" | "good" | "easy";
  /** `mastery_score` immediately before this rating was applied. */
  mastery_score: number | null;
  /** `times_used` immediately before this rating was applied. */
  times_used: number | null;
};

export type RapidReviewCompletePayload = {
  ratings: RapidReviewRatingRow[];
  /** True when the learner left before finishing all cards (early exit). */
  partial?: boolean;
};

async function enqueueStudyActivity(
  event_type: string,
  payload: Record<string, unknown>,
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
      event_type,
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
        event_type,
        ...payload,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (res.ok) {
      return { ok: true };
    }
    console.error(
      `[enqueueStudyActivity:${event_type}] n8n webhook non-2xx:`,
      res.status,
    );
    return { ok: false, error: `Webhook returned ${res.status}` };
  } catch (err) {
    clearTimeout(timeoutId);
    console.error(`[enqueueStudyActivity:${event_type}] n8n webhook error:`, err);
    return { ok: true };
  }
}

export async function queueRapidReviewComplete(
  payload: RapidReviewCompletePayload,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!payload.ratings?.length) {
    return { ok: false, error: "No ratings" };
  }
  return enqueueStudyActivity("rapid_review_complete", {
    ratings: payload.ratings,
    partial: payload.partial === true,
  });
}

export type StudyItemArchivePayload = {
  study_item_id: string;
  archived: boolean;
};

export async function queueStudyItemArchive(
  payload: StudyItemArchivePayload,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const study_item_id =
    typeof payload.study_item_id === "string"
      ? payload.study_item_id.trim()
      : "";
  if (!study_item_id) {
    return { ok: false, error: "Missing study item" };
  }
  if (typeof payload.archived !== "boolean") {
    return { ok: false, error: "Invalid archived value" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Not authenticated" };
  }

  const { data: row, error: fetchError } = await supabase
    .from("study_items")
    .select("id")
    .eq("id", study_item_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (fetchError) {
    return { ok: false, error: fetchError.message };
  }
  if (!row) {
    return { ok: false, error: "Not found" };
  }

  return enqueueStudyActivity("study_item_change", {
    study_item_id,
    archived: payload.archived,
  });
}
