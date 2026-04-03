export type SavedStudySortKey = "last_used" | "created" | "mastery_score";

export type SavedStudySortable = {
  date_added: string | null;
  last_used: string | null;
  /** DB may return number or numeric string */
  mastery_score: unknown;
};

function parseTime(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  return Number.isFinite(t) ? t : null;
}

function parseMastery(raw: unknown): number | null {
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw === "string" && raw.trim() !== "") {
    const n = parseFloat(raw);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/** Rounded 0–100 for UI; em dash when unknown (matches rapid-review scale). */
export function formatMasteryScore(raw: unknown): string {
  const n = parseMastery(raw);
  if (n === null) return "—";
  return String(Math.round(Math.min(100, Math.max(0, n))));
}

/** Client-side sort for saved vocab list (matches Library pill pattern). */
export function sortSavedStudyItems<T extends SavedStudySortable>(
  items: T[],
  sortKey: SavedStudySortKey,
  direction: "asc" | "desc",
): T[] {
  const sorted = [...items];
  switch (sortKey) {
    case "created": {
      sorted.sort((a, b) => {
        const ta = parseTime(a.date_added) ?? 0;
        const tb = parseTime(b.date_added) ?? 0;
        return direction === "desc" ? tb - ta : ta - tb;
      });
      break;
    }
    case "last_used": {
      /* DB column `last_used`; set in POST .../rapid-review/rate when the word is rated. */
      sorted.sort((a, b) => {
        const ta = parseTime(a.last_used);
        const tb = parseTime(b.last_used);
        if (ta === null && tb === null) return 0;
        if (ta === null) return 1;
        if (tb === null) return -1;
        return direction === "desc" ? tb - ta : ta - tb;
      });
      break;
    }
    case "mastery_score": {
      sorted.sort((a, b) => {
        const ma = parseMastery(a.mastery_score);
        const mb = parseMastery(b.mastery_score);
        if (ma === null && mb === null) return 0;
        if (ma === null) return 1;
        if (mb === null) return -1;
        return direction === "desc" ? mb - ma : ma - mb;
      });
      break;
    }
  }
  return sorted;
}
