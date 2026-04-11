import type { SupabaseClient, User } from "@supabase/supabase-js";

/**
 * Display name for greetings: **`user_settings.username`** only.
 * Tries `user_id` match, then `id` match (same row lookup as settings).
 */
export async function resolveUserDisplayName(
  supabase: SupabaseClient,
  user: User,
): Promise<string> {
  let username: string | null | undefined;

  const byUserId = await supabase
    .from("user_settings")
    .select("username")
    .eq("user_id", user.id)
    .maybeSingle();

  if (byUserId.error) {
    const msg = byUserId.error.message;
    const missingUserIdCol =
      /user_id/i.test(msg) &&
      (/does not exist/i.test(msg) || /schema cache/i.test(msg));
    if (!missingUserIdCol) {
      console.error("[display-name] user_settings (user_id) error:", msg);
    }
  } else if (byUserId.data) {
    username = (byUserId.data as { username?: string | null }).username;
  }

  if (username == null || String(username).trim() === "") {
    const byId = await supabase
      .from("user_settings")
      .select("username")
      .eq("id", user.id)
      .maybeSingle();

    if (byId.error) {
      console.error(
        "[display-name] user_settings (id) error:",
        byId.error.message,
      );
    } else if (byId.data) {
      username = (byId.data as { username?: string | null }).username;
    }
  }

  if (typeof username === "string") {
    const t = username.trim();
    if (t) return t;
  }
  return "";
}
