"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { getReadingMonthDayCounts } from "../reading-calendar-actions";
import { addCalendarMonths } from "@/lib/user-timezone";

export type ReadingCalendarModel = {
  todayDateKey: string;
  initialYear: number;
  initialMonth: number;
  minYear: number;
  minMonth: number;
  maxYear: number;
  maxMonth: number;
};

const MONTH_NAMES = [
  "",
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

/** Monday-first headers (short). */
const WEEKDAY_HEADERS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"] as const;

function isLeapYear(y: number): boolean {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

function daysInMonth(year: number, month: number): number {
  const dim = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (month === 2 && isLeapYear(year)) return 29;
  return dim[month - 1] ?? 31;
}

/** Monday = 0 … Sunday = 6 */
function weekdayMon0FromDateKey(dateKey: string): number {
  const [ys, ms, ds] = dateKey.split("-");
  const y = Number(ys);
  const m = Number(ms);
  const d = Number(ds);
  const wdSun0 = new Date(Date.UTC(y, m - 1, d, 12, 0, 0)).getUTCDay();
  return (wdSun0 + 6) % 7;
}

function enumerateMonths(
  minY: number,
  minM: number,
  maxY: number,
  maxM: number,
): { year: number; month: number }[] {
  const out: { year: number; month: number }[] = [];
  let y = minY;
  let m = minM;
  for (;;) {
    out.push({ year: y, month: m });
    if (y === maxY && m === maxM) break;
    const n = addCalendarMonths(y, m, 1);
    y = n.year;
    m = n.month;
  }
  return out;
}

type DayCell = { dateKey: string; day: number };

/** Week rows: each row is Mon → Sun, null = padding. */
function buildWeekRows(year: number, month: number): (DayCell | null)[][] {
  const dim = daysInMonth(year, month);
  const firstKey = `${year}-${String(month).padStart(2, "0")}-01`;
  const pad = weekdayMon0FromDateKey(firstKey);
  const rows: (DayCell | null)[][] = [];
  let row: (DayCell | null)[] = [];

  for (let i = 0; i < pad; i++) {
    row.push(null);
  }
  for (let d = 1; d <= dim; d++) {
    const dateKey = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    row.push({ dateKey, day: d });
    if (row.length === 7) {
      rows.push(row);
      row = [];
    }
  }
  if (row.length > 0) {
    while (row.length < 7) {
      row.push(null);
    }
    rows.push(row);
  }
  return rows;
}

function monthKey(year: number, month: number): string {
  return `${year}-${month}`;
}

type Props = {
  model: ReadingCalendarModel;
};

export function ReadingYearCalendar({ model }: Props) {
  const {
    todayDateKey,
    initialYear,
    initialMonth,
    minYear,
    minMonth,
    maxYear,
    maxMonth,
  } = model;

  const months = useMemo(
    () => enumerateMonths(minYear, minMonth, maxYear, maxMonth),
    [minYear, minMonth, maxYear, maxMonth],
  );

  const initialIndex = useMemo(() => {
    const i = months.findIndex(
      (x) => x.year === initialYear && x.month === initialMonth,
    );
    return i >= 0 ? i : 0;
  }, [months, initialYear, initialMonth]);

  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const indexRef = useRef(initialIndex);
  indexRef.current = activeIndex;

  const [monthCache, setMonthCache] = useState<
    Record<string, Record<string, number>>
  >({});
  /** Month key is only added after a successful fetch (avoids “stuck empty” if user navigates away mid-request). */
  const loadedRef = useRef<Set<string>>(new Set());
  const inFlightRef = useRef<Set<string>>(new Set());

  const scrollToIndex = useCallback(
    (index: number, behavior: ScrollBehavior) => {
      const el = scrollerRef.current;
      if (!el) return;
      const w = el.clientWidth;
      if (w <= 0) return;
      const clamped = Math.max(0, Math.min(months.length - 1, index));
      el.scrollTo({ left: clamped * w, behavior });
      setActiveIndex(clamped);
    },
    [months.length],
  );

  useLayoutEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const w = el.clientWidth;
        if (w <= 0) return;
        el.scrollTo({ left: initialIndex * w, behavior: "instant" });
        setActiveIndex(initialIndex);
      });
    });
    return () => cancelAnimationFrame(id);
  }, [initialIndex]);

  const onScroll = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const w = el.clientWidth;
    if (w <= 0) return;
    const i = Math.round(el.scrollLeft / w);
    const clamped = Math.max(0, Math.min(months.length - 1, i));
    if (clamped !== indexRef.current) {
      setActiveIndex(clamped);
    }
  }, [months.length]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [onScroll]);

  useEffect(() => {
    const load = (year: number, month: number) => {
      const key = monthKey(year, month);
      if (loadedRef.current.has(key) || inFlightRef.current.has(key)) return;
      inFlightRef.current.add(key);
      void (async () => {
        try {
          const res = await getReadingMonthDayCounts(year, month);
          if (res.ok) {
            loadedRef.current.add(key);
            setMonthCache((prev) => ({ ...prev, [key]: res.counts }));
          }
        } finally {
          inFlightRef.current.delete(key);
        }
      })();
    };

    const cur = months[activeIndex];
    if (!cur) return;

    load(cur.year, cur.month);
    if (activeIndex > 0) {
      const prev = months[activeIndex - 1];
      if (prev) load(prev.year, prev.month);
    }
    if (activeIndex < months.length - 1) {
      const next = months[activeIndex + 1];
      if (next) load(next.year, next.month);
    }
  }, [activeIndex, months]);

  if (months.length === 0) {
    return (
      <div className="w-full text-xs text-[var(--text-muted)]">
        Reading calendar is unavailable for this range.
      </div>
    );
  }

  const current = months[activeIndex] ?? months[0]!;
  const canPrev = activeIndex > 0;
  const canNext = activeIndex < months.length - 1;

  const currentMonthKey = monthKey(current.year, current.month);
  const countsForVisibleMonth = monthCache[currentMonthKey];
  const monthReadTotal =
    countsForVisibleMonth === undefined
      ? null
      : Object.values(countsForVisibleMonth).reduce((a, b) => a + b, 0);

  return (
    <div className="w-full">
      <h3 className="mb-1 text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--text-muted)]">
        Reading calendar
      </h3>

      <div className="mb-1 flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => scrollToIndex(activeIndex - 1, "smooth")}
          disabled={!canPrev}
          className="inline-flex shrink-0 rounded-lg border border-[var(--border-default)] bg-[var(--surface-elevated)] p-1 text-[var(--foreground)] transition-opacity disabled:pointer-events-none disabled:opacity-35 hover:border-[var(--border-strong)]"
          aria-label="Previous month"
        >
          <ChevronLeft className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
        </button>
        <p
          className="min-w-0 flex-1 text-center text-xs font-semibold tabular-nums tracking-tight text-[var(--foreground)] sm:text-sm"
          aria-live="polite"
        >
          {MONTH_NAMES[current.month]} {current.year}
        </p>
        <button
          type="button"
          onClick={() => scrollToIndex(activeIndex + 1, "smooth")}
          disabled={!canNext}
          className="inline-flex shrink-0 rounded-lg border border-[var(--border-default)] bg-[var(--surface-elevated)] p-1 text-[var(--foreground)] transition-opacity disabled:pointer-events-none disabled:opacity-35 hover:border-[var(--border-strong)]"
          aria-label="Next month"
        >
          <ChevronRight className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
        </button>
      </div>

      <div
        ref={scrollerRef}
        className="flex touch-pan-x snap-x snap-mandatory overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="region"
        aria-roledescription="carousel"
        aria-label="Months"
      >
        {months.map(({ year, month }) => {
          const weekRows = buildWeekRows(year, month);
          const mk = monthKey(year, month);
          const counts = monthCache[mk] ?? {};
          return (
            <div
              key={`${year}-${month}`}
              className="w-full min-w-full shrink-0 snap-center snap-always"
            >
              <div className="mb-1 grid grid-cols-7 gap-px text-center text-[9px] font-medium uppercase tracking-wide text-[var(--text-muted)] sm:text-[10px]">
                {WEEKDAY_HEADERS.map((h) => (
                  <span key={h}>{h}</span>
                ))}
              </div>
              <div className="flex flex-col gap-0.5">
                {weekRows.map((week, wi) => (
                  <div
                    key={wi}
                    className="grid grid-cols-7 gap-px rounded-full border border-[var(--border-default)]/70 bg-[var(--surface-elevated)] px-0.5 py-0.5 sm:px-1 sm:py-1"
                  >
                    {week.map((cell, di) => (
                      <div
                        key={di}
                        className="flex min-h-[1.5rem] flex-col items-center justify-center sm:min-h-[1.75rem]"
                      >
                        {cell ? (
                          <DayDisk
                            day={cell.day}
                            count={counts[cell.dateKey] ?? 0}
                            dateKey={cell.dateKey}
                            todayDateKey={todayDateKey}
                          />
                        ) : (
                          <span className="invisible text-[10px] tabular-nums">
                            0
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <p
        className="mt-1.5 text-center text-[10px] text-[var(--text-muted)] sm:text-xs"
        aria-live="polite"
      >
        {monthReadTotal === null ? (
          <>
            <span className="sr-only">Loading month total</span>
            <span aria-hidden>…</span>
          </>
        ) : (
          <>
            <span className="text-[var(--text-muted)]">Total: </span>
            <span className="font-semibold tabular-nums text-[var(--foreground)]">
              {monthReadTotal}
            </span>
            <span className="text-[var(--text-muted)]">
              {" "}
              {monthReadTotal === 1 ? "read" : "reads"}
            </span>
          </>
        )}
      </p>
    </div>
  );
}

function DayDisk({
  day,
  count,
  dateKey,
  todayDateKey,
}: {
  day: number;
  count: number;
  dateKey: string;
  todayDateKey: string;
}) {
  const has = count > 0;
  const isToday = todayDateKey && dateKey === todayDateKey;

  return (
    <div
      className={`relative flex h-6 w-6 items-center justify-center sm:h-7 sm:w-7 ${
        isToday
          ? "rounded-full ring-1 ring-[var(--nav-active-bg)] ring-offset-1 ring-offset-[var(--surface-elevated)]"
          : ""
      }`}
      title={
        has
          ? `${dateKey}: ${count} ${count === 1 ? "read" : "reads"}`
          : `${dateKey}: no reads`
      }
    >
      {has ? (
        <span
          className="absolute inset-px rounded-full bg-[var(--nav-active-bg)] sm:inset-0.5"
          aria-hidden
        />
      ) : null}
      <span
        className={`relative z-10 text-[10px] font-medium tabular-nums leading-none sm:text-[11px] ${
          has ? "text-[var(--foreground)]" : "text-[var(--text-muted)]"
        }`}
      >
        {day}
      </span>
    </div>
  );
}
