/**
 * Library list item: story fields plus latest user_progress (reading_date, fun_grade).
 */
export type LibraryItem = {
  uuid: string;
  story_title: string;
  word_count: number;
  reading_level: string;
  creation_date: string;
  reading_date: string | null;
  fun_grade: number | null;
};

export type LibrarySortKey = "last_read" | "difficulty" | "rating";

export function sortLibraryItems(
  items: LibraryItem[],
  sortKey: LibrarySortKey,
): LibraryItem[] {
  const sorted = [...items];
  switch (sortKey) {
    case "last_read":
      sorted.sort((a, b) => {
        const da = a.reading_date ? new Date(a.reading_date).getTime() : 0;
        const db = b.reading_date ? new Date(b.reading_date).getTime() : 0;
        return db - da; // newest first
      });
      break;
    case "difficulty":
      sorted.sort((a, b) =>
        (a.reading_level ?? "").localeCompare(b.reading_level ?? ""),
      );
      break;
    case "rating":
      sorted.sort((a, b) => {
        const ra = a.fun_grade ?? -1;
        const rb = b.fun_grade ?? -1;
        return rb - ra; // higher first
      });
      break;
  }
  return sorted;
}
