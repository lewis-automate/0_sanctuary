import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * IANA timezone from user_settings, or UTC.
 * Same lookup pattern as resolveUserDisplayName.
 */
export async function getUserTimezone(
  supabase: SupabaseClient,
  userId: string,
): Promise<string> {
  let row: { timezone?: string | null } | null = null;

  const byUserId = await supabase
    .from("user_settings")
    .select("timezone")
    .eq("user_id", userId)
    .maybeSingle();

  if (byUserId.error) {
    const msg = byUserId.error.message;
    if (!/timezone|schema|column|does not exist/i.test(msg)) {
      console.error("[user-timezone] user_settings (user_id):", msg);
    }
  } else if (byUserId.data) {
    row = byUserId.data as { timezone?: string | null };
  }

  if (!row?.timezone?.trim()) {
    const byId = await supabase
      .from("user_settings")
      .select("timezone")
      .eq("id", userId)
      .maybeSingle();
    if (byId.error) {
      const msg = byId.error.message;
      if (!/timezone|schema|column|does not exist/i.test(msg)) {
        console.error("[user-timezone] user_settings (id):", msg);
      }
    } else if (byId.data) {
      row = byId.data as { timezone?: string | null };
    }
  }

  const t = row?.timezone?.trim();
  return t || "UTC";
}

/** Calendar date YYYY-MM-DD for an instant in the given IANA zone. */
export function formatDateKeyInTimeZone(
  isoOrDate: string | Date,
  timeZone: string,
): string | null {
  const d =
    typeof isoOrDate === "string" ? new Date(isoOrDate) : isoOrDate;
  if (Number.isNaN(d.getTime())) return null;
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(d);
  } catch {
    return null;
  }
}

/** Current calendar year in the user's timezone. */
export function getCalendarYearInTimeZone(
  instant: Date,
  timeZone: string,
): number {
  try {
    const y = new Intl.DateTimeFormat("en", {
      timeZone,
      year: "numeric",
    }).formatToParts(instant);
    const part = y.find((p) => p.type === "year");
    const n = part ? Number(part.value) : NaN;
    return Number.isFinite(n) ? n : instant.getUTCFullYear();
  } catch {
    return instant.getUTCFullYear();
  }
}

/** Calendar month 1–12 in the user's timezone. */
export function getCalendarMonthInTimeZone(
  instant: Date,
  timeZone: string,
): number {
  try {
    const parts = new Intl.DateTimeFormat("en", {
      timeZone,
      month: "numeric",
    }).formatToParts(instant);
    const part = parts.find((p) => p.type === "month");
    const n = part ? Number(part.value) : NaN;
    return Number.isFinite(n) ? n : instant.getUTCMonth() + 1;
  } catch {
    return instant.getUTCMonth() + 1;
  }
}

/** Add signed months to a calendar year/month (Gregorian). */
export function addCalendarMonths(
  year: number,
  month: number,
  delta: number,
): { year: number; month: number } {
  const idx = year * 12 + (month - 1) + delta;
  return { year: Math.floor(idx / 12), month: (idx % 12) + 1 };
}

/**
 * Smallest UTC timestamp (ms) that falls on `dateKey` (YYYY-MM-DD) in `timeZone`.
 * Used to build half-open month ranges for Supabase without Luxon.
 */
export function findFirstInstantOfCalendarDay(
  dateKey: string,
  timeZone: string,
): number {
  const parts = dateKey.split("-").map(Number);
  const y = parts[0];
  const m = parts[1];
  const d = parts[2];
  if (
    y === undefined ||
    m === undefined ||
    d === undefined ||
    !Number.isFinite(y) ||
    !Number.isFinite(m) ||
    !Number.isFinite(d)
  ) {
    return Date.now();
  }
  const anchor = Date.UTC(y, m - 1, d, 0, 0, 0);
  let lo = anchor - 86400000 * 5;
  let hi = anchor + 86400000 * 5;
  let answer = -1;

  for (let iter = 0; iter < 64 && lo <= hi; iter++) {
    const mid = Math.floor((lo + hi) / 2);
    const k = formatDateKeyInTimeZone(new Date(mid), timeZone);
    if (k === null) {
      lo = mid + 1;
      continue;
    }
    if (k < dateKey) {
      lo = mid + 1;
    } else if (k > dateKey) {
      hi = mid - 1;
    } else {
      answer = mid;
      hi = mid - 1;
    }
  }

  if (answer !== -1) {
    return answer;
  }

  for (let t = anchor - 86400000 * 10; t <= anchor + 86400000 * 10; t += 60000) {
    if (formatDateKeyInTimeZone(new Date(t), timeZone) === dateKey) {
      return t;
    }
  }

  return anchor;
}

/**
 * Half-open UTC interval [startUtc, endUtc) for the given calendar month in `timeZone`.
 * `endUtc` is the first instant of the following month in that zone.
 */
export function getUtcBoundsForMonth(
  year: number,
  month: number,
  timeZone: string,
): { startUtc: string; endUtc: string } {
  const startKey = `${year}-${String(month).padStart(2, "0")}-01`;
  const next = addCalendarMonths(year, month, 1);
  const endKey = `${next.year}-${String(next.month).padStart(2, "0")}-01`;
  const startMs = findFirstInstantOfCalendarDay(startKey, timeZone);
  const endMs = findFirstInstantOfCalendarDay(endKey, timeZone);
  return {
    startUtc: new Date(startMs).toISOString(),
    endUtc: new Date(endMs).toISOString(),
  };
}
