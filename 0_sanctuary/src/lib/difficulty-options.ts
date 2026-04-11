/** CEFR-style levels for generated stories — keep in sync with profile defaults (settings). */
export const DIFFICULTY_OPTIONS = [
  "A1",
  "A1/A2",
  "A2",
  "A2/B1",
  "B1",
  "B1/B2",
  "B2",
  "B2/C1",
] as const;

export type DifficultyOption = (typeof DIFFICULTY_OPTIONS)[number];
