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

export type LibrarySortKey = "created" | "times_read" | "rating";

export function sortLibraryItems(
  items: LibraryItem[],
  sortKey: LibrarySortKey,
  direction: "asc" | "desc",
): LibraryItem[] {
  const sorted = [...items];
  switch (sortKey) {
    case "created":
      sorted.sort((a, b) => {
        const ta = a.creation_date
          ? new Date(a.creation_date).getTime()
          : 0;
        const tb = b.creation_date
          ? new Date(b.creation_date).getTime()
          : 0;
        return direction === "desc" ? tb - ta : ta - tb;
      });
      break;
    case "times_read":
      sorted.sort((a, b) => {
        const ca = a.read_count;
        const cb = b.read_count;
        return direction === "desc" ? cb - ca : ca - cb;
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
