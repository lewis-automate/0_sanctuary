/**
 * Month-to-date “showing up” encouragement for the home screen.
 * Tiers follow Sanctuary’s safe, no-shame tone.
 */

export type ShowUpEncouragement = {
  percent: number;
  activeDays: number;
  eligibleDays: number;
  /** Primary stat line for screen readers and sighted users */
  summaryLine: string;
  /** Rotating line by tier; stable within a month for a given user */
  encouragement: string;
};

const TIER_GENTLE = [
  "Starting is the hard part.",
  "Every day you open the app counts.",
  "Small steps still move you forward.",
  "There’s no wrong pace here.",
] as const;

const TIER_MOMENTUM = [
  "You’re building a rhythm.",
  "Keep going—consistency beats intensity.",
  "This is what practice looks like.",
  "You’re finding your groove.",
] as const;

const TIER_DOING_WELL = [
  "You’re doing well—keep leaning in.",
  "Nice work showing up more often than not.",
  "That steady effort adds up.",
  "You’re in a good flow.",
] as const;

const TIER_STRONG = [
  "Strong month—you’re making this a habit.",
  "Most days, you’re here. That’s real commitment.",
  "This kind of showing up is hard—and you’re doing it.",
  "Your future self will notice this stretch.",
] as const;

const TIER_AMAZING = [
  "Consistent in a way most people never manage.",
  "This is amazing—seriously.",
  "You’re showing up like someone who means it.",
  "Rare air. Keep going.",
] as const;

const TIER_PERFECT = [
  "Every day this month. That’s not luck—that’s you.",
  "Perfect month on the calendar. Wow.",
  "You showed up every single day. That’s extraordinary.",
  "100%—that’s rare, and it’s worth celebrating.",
] as const;

function tierForPercent(percent: number): 0 | 1 | 2 | 3 | 4 | 5 {
  if (percent >= 100) return 5;
  if (percent >= 80) return 4;
  if (percent >= 60) return 3;
  if (percent >= 40) return 2;
  if (percent >= 20) return 1;
  return 0;
}

function stablePick<T extends readonly string[]>(
  userId: string,
  periodKey: string,
  lines: T,
): string {
  const seed = `${userId}:${periodKey}`;
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) | 0;
  }
  const idx = Math.abs(h) % lines.length;
  return lines[idx]!;
}

export function buildShowUpEncouragement(
  activeDays: number,
  eligibleDays: number,
  calendarYear: number,
  calendarMonth: number,
  userId: string,
): ShowUpEncouragement | null {
  if (eligibleDays <= 0) return null;

  const percent = Math.min(
    100,
    Math.floor((100 * activeDays) / eligibleDays),
  );

  const summaryLine = `You showed up on ${activeDays} of ${eligibleDays} days so far this month (${percent}%).`;

  const periodKey = `${calendarYear}-${String(calendarMonth).padStart(2, "0")}`;
  const tier = tierForPercent(percent);

  let pool: readonly string[];
  switch (tier) {
    case 5:
      pool = TIER_PERFECT;
      break;
    case 4:
      pool = TIER_AMAZING;
      break;
    case 3:
      pool = TIER_STRONG;
      break;
    case 2:
      pool = TIER_DOING_WELL;
      break;
    case 1:
      pool = TIER_MOMENTUM;
      break;
    default:
      pool = TIER_GENTLE;
  }

  const encouragement = stablePick(userId, periodKey, pool);

  return {
    percent,
    activeDays,
    eligibleDays,
    summaryLine,
    encouragement,
  };
}
