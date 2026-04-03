"use server";

import { createClient } from "@/lib/supabase/server";

export type UserSettingsProfile = {
  username: string;
  target_language: string;
  native_language: string;
  difficulty: string | null;
  word_target: number | null;
  last_stories_filter: number | null;
  preferred_tone: string;
  vocab_chunking: boolean;
  app_theme: "Light" | "Dark";
};

/** Every item has the same keys; new topics use id: null */
export type UpsertTopic = {
  id: number | string | null;
  topic_name: string;
  active: boolean;
};

/** Optional hint for n8n / workers (mirrored in activity_queue.payload). */
export type UserSettingsSaveTrigger =
  | "theme_toggle"
  | "save_basic"
  | "save_topics"
  | "save_tone"
  | "save_all";

export type UserSettingsSavePayload = {
  user_settings: UserSettingsProfile;
  upsert_topics: UpsertTopic[];
  deleted_ids: (number | string)[];
  settings_trigger?: UserSettingsSaveTrigger;
};

export async function queueUserSettings(
  payload: UserSettingsSavePayload,
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
      event_type: "user_settings",
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
  const timeoutId = setTimeout(() => controller.abort(), 10_000);

  try {
    const res = await fetch(n8nUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        job_id: row.id,
        user_id: user.id,
        event_type: "user_settings",
        payload,
        ...payload,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!res.ok) {
      return { ok: false, error: `Webhook returned ${res.status}` };
    }
  } catch (err) {
    clearTimeout(timeoutId);
    console.error("[queueUserSettings] n8n webhook error:", err);
    // Settings are already queued, treat as success
  }

  return { ok: true };
}

