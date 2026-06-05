import {
  normalizeAppTheme,
  toHtmlDatasetValue,
  type AppThemePreference,
} from "@/lib/app-theme";
import { createClient } from "@/lib/supabase/server";

type HtmlTheme = ReturnType<typeof toHtmlDatasetValue>;
type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

async function loadAppThemeRow(
  supabase: SupabaseServerClient,
  userId: string,
): Promise<Record<string, unknown> | null> {
  let row: Record<string, unknown> | null = null;

  const byUserId = await supabase
    .from("user_settings")
    .select("app_theme")
    .eq("user_id", userId)
    .maybeSingle();

  if (byUserId.error) {
    const msg = byUserId.error.message;
    const missingUserIdCol =
      /user_id/i.test(msg) &&
      (/does not exist/i.test(msg) || /schema cache/i.test(msg));
    if (!missingUserIdCol) {
      console.error("[theme] user_settings (user_id) error:", msg);
    }
  } else if (byUserId.data) {
    row = byUserId.data as Record<string, unknown>;
  }

  if (!row) {
    const byId = await supabase
      .from("user_settings")
      .select("app_theme")
      .eq("id", userId)
      .maybeSingle();

    if (byId.error) {
      console.error("[theme] user_settings (id) error:", byId.error.message);
    } else if (byId.data) {
      row = byId.data as Record<string, unknown>;
    }
  }

  return row;
}

/**
 * Loads `app_theme` from user_settings (same fallbacks as settings/page).
 */
export async function resolveDataAppTheme(
  supabase: SupabaseServerClient,
  userId: string,
): Promise<HtmlTheme> {
  const row = await loadAppThemeRow(supabase, userId);
  return toHtmlDatasetValue(normalizeAppTheme(row?.app_theme));
}

/** Same DB fallbacks as layout SSR; returns Light | Dark for client toggles. */
export async function resolveAppThemePreference(
  supabase: SupabaseServerClient,
  userId: string,
): Promise<AppThemePreference> {
  const row = await loadAppThemeRow(supabase, userId);
  return normalizeAppTheme(row?.app_theme);
}
