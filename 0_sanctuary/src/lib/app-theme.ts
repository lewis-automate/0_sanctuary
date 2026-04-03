export type AppThemePreference = "Light" | "Dark";

export type AppThemeHtmlValue = "light" | "dark";

/**
 * Normalize DB / payload values to Light | Dark (case-insensitive).
 */
export function normalizeAppTheme(raw: unknown): AppThemePreference {
  if (typeof raw !== "string") return "Light";
  const t = raw.trim().toLowerCase();
  if (t === "dark") return "Dark";
  return "Light";
}

export function toHtmlDatasetValue(
  theme: AppThemePreference,
): AppThemeHtmlValue {
  return theme === "Dark" ? "dark" : "light";
}
