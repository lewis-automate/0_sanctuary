import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Loads target + native language from user_settings (user_id or id) or users fallback.
 */
export async function getUserLanguagePair(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ targetLanguage: string; nativeLanguage: string }> {
  let row: Record<string, unknown> | null = null;

  const byUserId = await supabase
    .from("user_settings")
    .select("target_language, native_language")
    .eq("user_id", userId)
    .maybeSingle();

  if (!byUserId.error && byUserId.data) {
    row = byUserId.data as Record<string, unknown>;
  }

  if (!row) {
    const byId = await supabase
      .from("user_settings")
      .select("target_language, native_language")
      .eq("id", userId)
      .maybeSingle();
    if (!byId.error && byId.data) {
      row = byId.data as Record<string, unknown>;
    }
  }

  if (row) {
    return {
      targetLanguage: String(row.target_language ?? ""),
      nativeLanguage: String(row.native_language ?? ""),
    };
  }

  const usersRes = await supabase
    .from("users")
    .select("target_language, native_language")
    .eq("id", userId)
    .maybeSingle();

  if (usersRes.data) {
    const u = usersRes.data as Record<string, unknown>;
    return {
      targetLanguage: String(u.target_language ?? ""),
      nativeLanguage: String(u.native_language ?? ""),
    };
  }

  return { targetLanguage: "", nativeLanguage: "" };
}
