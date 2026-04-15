/**
 * Full IANA timezone identifiers for dropdowns (e.g. America/New_York).
 * Uses the runtime's canonical list when available.
 */
export function getSortedIanaTimeZones(): string[] {
  try {
    const supportedValuesOf = (
      Intl as typeof Intl & {
        supportedValuesOf?: (key: "timeZone") => string[];
      }
    ).supportedValuesOf;
    if (typeof supportedValuesOf === "function") {
      return [...supportedValuesOf.call(Intl, "timeZone")].sort((a, b) =>
        a.localeCompare(b),
      );
    }
  } catch {
    // ignore
  }
  return ["UTC"];
}
