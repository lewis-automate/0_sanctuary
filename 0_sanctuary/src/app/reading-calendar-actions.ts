"use server";

import {
  addCalendarMonths,
  formatDateKeyInTimeZone,
  getCalendarMonthInTimeZone,
  getCalendarYearInTimeZone,
  getUtcBoundsForMonth,
  getUserTimezone,
} from "@/lib/user-timezone";
import { createClient } from "@/lib/supabase/server";

const PRODUCT_MIN_YEAR = 2026;

function monthOrdinal(year: number, month: number): number {
  return year * 12 + month - 1;
}

function resolveMinCalendarYear(
  timeZone: string,
  accountCreatedAt: string | undefined,
): { minYear: number; minMonth: number } {
  if (!accountCreatedAt) {
    return { minYear: PRODUCT_MIN_YEAR, minMonth: 1 };
  }
  const start = new Date(accountCreatedAt);
  return {
    minYear: Math.max(
      PRODUCT_MIN_YEAR,
      getCalendarYearInTimeZone(start, timeZone),
    ),
    minMonth: getCalendarMonthInTimeZone(start, timeZone),
  };
}

/**
 * Loads user_progress rows for one calendar month (user TZ), buckets by
 * formatDateKeyInTimeZone for the reading calendar UI.
 */
export async function getReadingMonthDayCounts(
  year: number,
  month: number,
): Promise<
  { ok: true; counts: Record<string, number> } | { ok: false; error: string }
> {
  if (month < 1 || month > 12 || !Number.isInteger(year)) {
    return { ok: false, error: "Invalid year or month" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Not authenticated" };
  }

  const timeZone = await getUserTimezone(supabase, user.id);
  const { minYear, minMonth } = resolveMinCalendarYear(
    timeZone,
    user.created_at,
  );
  const now = new Date();
  const maxNav = addCalendarMonths(
    getCalendarYearInTimeZone(now, timeZone),
    getCalendarMonthInTimeZone(now, timeZone),
    36,
  );

  const minOrd = monthOrdinal(minYear, minMonth);
  const maxOrd = monthOrdinal(maxNav.year, maxNav.month);
  const reqOrd = monthOrdinal(year, month);
  if (reqOrd < minOrd || reqOrd > maxOrd) {
    return { ok: false, error: "Month out of range" };
  }

  const { startUtc, endUtc } = getUtcBoundsForMonth(year, month, timeZone);

  const { data: rows, error } = await supabase
    .from("user_progress")
    .select("reading_date")
    .eq("user_id", user.id)
    .gte("reading_date", startUtc)
    .lt("reading_date", endUtc);

  if (error) {
    return { ok: false, error: error.message };
  }

  const counts: Record<string, number> = {};
  for (const row of rows ?? []) {
    if (!row.reading_date) continue;
    const key = formatDateKeyInTimeZone(row.reading_date, timeZone);
    if (!key) continue;
    counts[key] = (counts[key] ?? 0) + 1;
  }

  return { ok: true, counts };
}
