/** Max highlight length for Translate action (graphemes). */
export const MAX_READER_TRANSLATE_SELECTION_GRAPHEMES = 100;

/** Max highlight length for Grammar action (graphemes). */
export const MAX_READER_GRAMMAR_SELECTION_GRAPHEMES = 50;

/** Max highlight length for Save-to-vocab action (graphemes). */
export const MAX_READER_VOCAB_SELECTION_GRAPHEMES = 50;

/** Surrounding passage sent to translate/grammar APIs; truncated by character (UTF-16 code units). */
export const MAX_READER_CONTEXT_CHARS = 1250;

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

export function isReaderTranslateSelectionWithinLimit(text: string): boolean {
  return (
    countReaderSelectionGraphemes(text) <=
    MAX_READER_TRANSLATE_SELECTION_GRAPHEMES
  );
}

export function isReaderGrammarSelectionWithinLimit(text: string): boolean {
  return (
    countReaderSelectionGraphemes(text) <=
    MAX_READER_GRAMMAR_SELECTION_GRAPHEMES
  );
}

export function isReaderVocabSelectionWithinLimit(text: string): boolean {
  return (
    countReaderSelectionGraphemes(text) <=
    MAX_READER_VOCAB_SELECTION_GRAPHEMES
  );
}
