import type {
  UpsertTopic,
  UserSettingsProfile,
} from "@/app/settings/actions";
import { normalizeAppTheme } from "@/lib/app-theme";
import type { SupabaseClient } from "@supabase/supabase-js";

function coerceVocabChunkingToBoolean(value: unknown): boolean {
  if (value === true) return true;
  if (value === false) return false;
  if (typeof value === "string") {
    const lower = value.toLowerCase();
    if (lower === "true" || lower === "on") return true;
    if (lower === "false" || lower === "off") return false;
  }
  return false;
}

function coerceLastStoriesFilter(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.min(99, Math.trunc(n)));
}

function coerceWordTarget(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.trunc(n);
}

function mapRowToUserProfile(
  row: Record<string, unknown>,
  source: "user_settings" | "users",
): UserSettingsProfile {
  const username =
    source === "users"
      ? String(row.name ?? row.username ?? "")
      : String(row.username ?? row.name ?? "");

  const levelRaw =
    (typeof row.reading_level_desc === "string"
      ? row.reading_level_desc
      : null) ??
    (typeof row.difficulty === "string" ? row.difficulty : null);
  const difficulty =
    typeof levelRaw === "string" && levelRaw.trim() !== ""
      ? levelRaw.trim()
      : null;

  return {
    username,
    target_language: String(row.target_language ?? ""),
    native_language: String(row.native_language ?? ""),
    timezone: String(row.timezone ?? ""),
    difficulty,
    word_target: coerceWordTarget(row.word_target),
    last_stories_filter: coerceLastStoriesFilter(
      row.last_stories_filter ?? row.past,
    ),
    preferred_tone: String(row.preferred_tone ?? ""),
    vocab_chunking: coerceVocabChunkingToBoolean(row.vocab_chunking),
    app_theme: normalizeAppTheme(row.app_theme),
  };
}

const EMPTY_PROFILE: UserSettingsProfile = {
  username: "",
  target_language: "",
  native_language: "",
  timezone: "",
  difficulty: null,
  word_target: null,
  last_stories_filter: null,
  preferred_tone: "",
  vocab_chunking: false,
  app_theme: "Light",
};

export async function loadUserSettingsProfile(
  supabase: SupabaseClient,
  userId: string,
): Promise<UserSettingsProfile> {
  let userSettingsRow: Record<string, unknown> | null = null;

  const byUserId = await supabase
    .from("user_settings")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (byUserId.error) {
    const msg = byUserId.error.message;
    const missingUserIdCol =
      /user_id/i.test(msg) &&
      (/does not exist/i.test(msg) || /schema cache/i.test(msg));
    if (!missingUserIdCol) {
      console.error("[user-settings-profile] user_settings (user_id) error:", msg);
    }
  } else if (byUserId.data) {
    userSettingsRow = byUserId.data as Record<string, unknown>;
  }

  if (!userSettingsRow) {
    const byId = await supabase
      .from("user_settings")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (byId.error) {
      console.error(
        "[user-settings-profile] user_settings (id) error:",
        byId.error.message,
      );
    } else if (byId.data) {
      userSettingsRow = byId.data as Record<string, unknown>;
    }
  }

  if (userSettingsRow) {
    return mapRowToUserProfile(userSettingsRow, "user_settings");
  }

  const usersRes = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (usersRes.error) {
    console.error("[user-settings-profile] users query error:", usersRes.error.message);
  }

  if (usersRes.data) {
    return mapRowToUserProfile(usersRes.data as Record<string, unknown>, "users");
  }

  return EMPTY_PROFILE;
}

export async function loadUserTopicsForSave(
  supabase: SupabaseClient,
  userId: string,
): Promise<UpsertTopic[]> {
  const res = await supabase
    .from("user_topics")
    .select("id, topic_name, active")
    .eq("user_id", userId)
    .order("topic_name", { ascending: true });

  if (res.error) {
    console.error("[user-settings-profile] user_topics query error:", res.error.message);
    return [];
  }

  return (
    res.data?.map((t) => ({
      id: String(t.id),
      topic_name: t.topic_name ?? "",
      active: !!t.active,
    })) ?? []
  );
}
