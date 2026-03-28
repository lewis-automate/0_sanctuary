const MAX_LEN = 128;

/**
 * Accepts typical Supabase / Postgres feedback primary keys (UUID, bigint, text)
 * without rejecting valid rows. Rejects obviously unsafe path segments.
 */
export function isSafeFeedbackIdParam(id: string): boolean {
  const s = id.trim();
  if (!s || s.length > MAX_LEN) return false;
  if (s.includes("/") || s.includes("\\") || s.includes("..")) return false;
  return new RegExp(`^[\\w.-]{1,${MAX_LEN}}$`).test(s);
}
