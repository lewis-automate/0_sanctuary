/**
 * Library list item: story fields plus latest user_progress (reading_date, fun_grade)
 * and how many times the current user has read the story.
 */
export type LibraryItem = {
  uuid: string;
  story_title: string;
  word_count: number;
  reading_level: string;
  creation_date: string;
  reading_date: string | null;
  fun_grade: number | null;
   read_count: number;
};

export type LibrarySortKey = "last_read" | "difficulty" | "rating";

export function sortLibraryItems(
  items: LibraryItem[],
  sortKey: LibrarySortKey,
  direction: "asc" | "desc",
): LibraryItem[] {
  const sorted = [...items];
  switch (sortKey) {
    case "last_read":
      sorted.sort((a, b) => {
        const da = a.reading_date ? new Date(a.reading_date).getTime() : null;
        const db = b.reading_date ? new Date(b.reading_date).getTime() : null;

        // For "most recent", treat unread (null) as most recent when sorting desc.
        const va = da ?? Number.POSITIVE_INFINITY;
        const vb = db ?? Number.POSITIVE_INFINITY;

        return direction === "desc" ? vb - va : va - vb;
      });
      break;
    case "difficulty":
      sorted.sort((a, b) => {
        const cmp = (a.reading_level ?? "").localeCompare(
          b.reading_level ?? "",
        );
        return direction === "asc" ? cmp : -cmp;
      });
      break;
    case "rating":
      sorted.sort((a, b) => {
        const ra = a.fun_grade ?? -1;
        const rb = b.fun_grade ?? -1;
        return direction === "desc" ? rb - ra : ra - rb;
      });
      break;
  }
  return sorted;
}
