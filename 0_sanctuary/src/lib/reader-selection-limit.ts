/**
 * Max length for reader highlight actions (translate, grammar, save-to-vocab).
 * Grapheme-based so CJK (e.g. Korean syllables) counts fairly vs Latin letters.
 * ~One long sentence in English prose.
 */
export const MAX_READER_SELECTION_GRAPHEMES = 200;

export function countReaderSelectionGraphemes(text: string): number {
  const t = text.trim();
  if (!t) return 0;
  try {
    const Seg = Intl.Segmenter;
    if (typeof Seg === "function") {
      const seg = new Seg(undefined, { granularity: "grapheme" });
      return [...seg.segment(t)].length;
    }
  } catch {
    /* ignore */
  }
  return [...t].length;
}

export function isReaderSelectionWithinLimit(text: string): boolean {
  return countReaderSelectionGraphemes(text) <= MAX_READER_SELECTION_GRAPHEMES;
}
