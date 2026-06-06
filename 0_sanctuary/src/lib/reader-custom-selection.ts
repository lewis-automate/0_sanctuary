import { languageNameToSegmenterLocale } from "@/lib/translation-language-codes";

export type ReaderTextSelection = {
  paragraphIndex: number;
  start: number;
  end: number;
  text: string;
};

/** UTF-16 index of the grapheme boundary immediately before `offset`. */
function graphemeBoundaryBefore(text: string, offset: number): number {
  if (offset <= 0) return 0;
  try {
    const Seg = Intl.Segmenter;
    if (typeof Seg === "function") {
      const seg = new Seg(undefined, { granularity: "grapheme" });
      let prev = 0;
      for (const part of seg.segment(text)) {
        const next = part.index + part.segment.length;
        if (next >= offset) return part.index;
        prev = next;
      }
      return prev;
    }
  } catch {
    /* fall through */
  }
  const c = text.charCodeAt(offset - 1);
  if (c >= 0xdc00 && c <= 0xdfff && offset >= 2) return offset - 2;
  return offset - 1;
}

/** UTF-16 index of the grapheme boundary immediately after `offset`. */
function graphemeBoundaryAfter(text: string, offset: number): number {
  if (offset >= text.length) return text.length;
  try {
    const Seg = Intl.Segmenter;
    if (typeof Seg === "function") {
      const seg = new Seg(undefined, { granularity: "grapheme" });
      for (const part of seg.segment(text)) {
        const start = part.index;
        const end = start + part.segment.length;
        if (end > offset) return end;
      }
      return text.length;
    }
  } catch {
    /* fall through */
  }
  const c = text.charCodeAt(offset);
  if (c >= 0xd800 && c <= 0xdbff && offset + 1 < text.length) {
    return offset + 2;
  }
  return offset + 1;
}

function getTextOffsetInElement(
  root: HTMLElement,
  node: Node,
  offset: number,
): number | null {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let total = 0;
  let current: Node | null;
  while ((current = walker.nextNode())) {
    if (current === node) return total + offset;
    total += (current as Text).data.length;
  }
  return null;
}

function caretOffsetFromPoint(
  root: HTMLElement,
  clientX: number,
  clientY: number,
): number | null {
  const doc = root.ownerDocument;
  const tryPoint = (x: number, y: number): number | null => {
    let range: Range | null = null;
    if (doc.caretRangeFromPoint) {
      range = doc.caretRangeFromPoint(x, y);
    } else {
      const pos = (
        doc as Document & {
          caretPositionFromPoint?: (
            px: number,
            py: number,
          ) => { offsetNode: Node; offset: number } | null;
        }
      ).caretPositionFromPoint?.(x, y);
      if (pos) {
        range = doc.createRange();
        range.setStart(pos.offsetNode, pos.offset);
        range.collapse(true);
      }
    }
    if (!range || !root.contains(range.startContainer)) return null;
    return getTextOffsetInElement(root, range.startContainer, range.startOffset);
  };

  const nudges: Array<[number, number]> = [
    [clientX, clientY],
    [clientX, clientY - 6],
    [clientX, clientY + 6],
    [clientX - 4, clientY],
    [clientX + 4, clientY],
  ];
  for (const [x, y] of nudges) {
    const offset = tryPoint(x, y);
    if (offset !== null) return offset;
  }
  return estimateOffsetFromPoint(root, clientX, clientY);
}

/** Rough fallback when caret APIs fail on quick mobile taps. */
function estimateOffsetFromPoint(
  root: HTMLElement,
  clientX: number,
  clientY: number,
): number | null {
  const text = root.textContent ?? "";
  if (!text.length) return null;

  const range = root.ownerDocument.createRange();
  range.selectNodeContents(root);
  const rects = [...range.getClientRects()];
  if (!rects.length) return null;

  let lineRect = rects[0]!;
  let bestDist = Infinity;
  for (const rect of rects) {
    const midY = rect.top + rect.height / 2;
    const dist = Math.abs(clientY - midY);
    if (dist < bestDist) {
      bestDist = dist;
      lineRect = rect;
    }
  }

  if (lineRect.width <= 0) return null;
  const ratio = Math.max(0, Math.min(1, (clientX - lineRect.left) / lineRect.width));
  return Math.max(0, Math.min(text.length, Math.round(ratio * text.length)));
}

function expandToNearestWord(
  text: string,
  offset: number,
  locale?: string,
): { start: number; end: number } {
  const clamped = Math.max(0, Math.min(offset, text.length));
  try {
    const Seg = Intl.Segmenter;
    if (typeof Seg === "function") {
      const loc = locale?.trim() || undefined;
      const seg = new Seg(loc, { granularity: "word" });
      let best: { start: number; end: number } | null = null;
      let bestDist = Infinity;
      for (const part of seg.segment(text)) {
        const trimmed = part.segment.trim();
        if (!trimmed) continue;
        const rel = part.segment.indexOf(trimmed);
        const start = part.index + rel;
        const end = start + trimmed.length;
        const dist = clamped < start ? start - clamped : clamped > end ? clamped - end : 0;
        if (dist < bestDist) {
          bestDist = dist;
          best = { start, end };
        }
      }
      if (best) return best;
    }
  } catch {
    /* fall through */
  }
  const end = graphemeBoundaryAfter(text, clamped);
  const start = graphemeBoundaryBefore(text, clamped);
  return { start, end: Math.max(end, start + 1) };
}

export function expandToWord(
  text: string,
  offset: number,
  languageName?: string,
): { start: number; end: number } {
  const clamped = Math.max(0, Math.min(offset, text.length));
  const locale = languageNameToSegmenterLocale(languageName);

  try {
    const Seg = Intl.Segmenter;
    if (typeof Seg === "function") {
      const seg = new Seg(locale, { granularity: "word" });
      for (const part of seg.segment(text)) {
        const start = part.index;
        const end = start + part.segment.length;
        if (clamped >= start && clamped < end) {
          const trimmed = part.segment.trim();
          if (!trimmed) {
            return expandToNearestWord(text, clamped, locale);
          }
          const rel = part.segment.indexOf(trimmed);
          return {
            start: start + rel,
            end: start + rel + trimmed.length,
          };
        }
      }
    }
  } catch {
    /* fall through */
  }

  return expandToNearestWord(text, clamped, locale);
}

export function getTapSelectionInParagraph(
  paragraphEl: HTMLElement,
  paragraphIndex: number,
  paragraphText: string,
  clientX: number,
  clientY: number,
  languageName?: string,
): ReaderTextSelection | null {
  const offset = caretOffsetFromPoint(paragraphEl, clientX, clientY);
  if (offset === null) return null;
  const { start, end } = expandToWord(paragraphText, offset, languageName);
  if (start >= end) return null;
  const text = paragraphText.slice(start, end);
  if (!text.trim()) return null;
  return { paragraphIndex, start, end, text };
}

export function nudgeSelectionShrinkFromRight(
  paragraphText: string,
  start: number,
  end: number,
): ReaderTextSelection | null {
  if (start >= end) return null;
  const newEnd = graphemeBoundaryBefore(paragraphText, end);
  if (newEnd <= start) return null;
  const text = paragraphText.slice(start, newEnd);
  if (!text.trim()) return null;
  return { paragraphIndex: 0, start, end: newEnd, text };
}

export function nudgeSelectionExpandRight(
  paragraphText: string,
  start: number,
  end: number,
): ReaderTextSelection | null {
  if (start >= end) return null;
  const newEnd = graphemeBoundaryAfter(paragraphText, end);
  if (newEnd <= end || newEnd > paragraphText.length) return null;
  const text = paragraphText.slice(start, newEnd);
  if (!text.trim()) return null;
  return { paragraphIndex: 0, start, end: newEnd, text };
}

export function withParagraphIndex(
  selection: Omit<ReaderTextSelection, "paragraphIndex"> & {
    paragraphIndex?: number;
  },
  paragraphIndex: number,
): ReaderTextSelection {
  return {
    paragraphIndex,
    start: selection.start,
    end: selection.end,
    text: selection.text,
  };
}
