/** Previous UTF-16 index (handles surrogate pairs). */
function utf16PrevIndex(s: string, i: number): number {
  if (i <= 0) return 0;
  const c = s.charCodeAt(i - 1);
  if (c >= 0xdc00 && c <= 0xdfff && i >= 2) return i - 2;
  return i - 1;
}

/** Next UTF-16 index after code unit at i (handles surrogate pairs). */
function utf16NextIndex(s: string, i: number): number {
  if (i >= s.length) return s.length;
  const c = s.charCodeAt(i);
  if (c >= 0xd800 && c <= 0xdbff && i + 1 < s.length) return i + 2;
  return i + 1;
}

function collectTextNodes(root: HTMLElement): Text[] {
  const out: Text[] = [];
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
  let n: Node | null;
  while ((n = w.nextNode())) out.push(n as Text);
  return out;
}

/**
 * Shrink the selection by one character from the right (move the exclusive end
 * left). Clears the selection if nothing would remain. Returns false only if
 * the range could not be adjusted (e.g. already collapsed).
 */
export function nudgeSelectionShrinkFromRight(root: HTMLElement): boolean {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount !== 1) return false;
  const range = sel.getRangeAt(0);
  if (range.collapsed) return false;
  if (!root.contains(range.commonAncestorContainer)) return false;

  const end = range.endContainer;
  if (end.nodeType !== Node.TEXT_NODE) return false;
  const en = end as Text;
  const eo = range.endOffset;

  const r = range.cloneRange();
  const texts = collectTextNodes(root);

  if (eo > 0) {
    const newEnd = utf16PrevIndex(en.data, eo);
    r.setEnd(en, newEnd);
  } else {
    const idx = texts.indexOf(en);
    if (idx <= 0) {
      sel.removeAllRanges();
      return true;
    }
    const prev = texts[idx - 1]!;
    if (!prev.data.length) {
      sel.removeAllRanges();
      return true;
    }
    const newEnd = utf16PrevIndex(prev.data, prev.data.length);
    r.setEnd(prev, newEnd);
  }

  if (r.collapsed || !r.toString()) {
    sel.removeAllRanges();
    return true;
  }

  sel.removeAllRanges();
  sel.addRange(r);
  return true;
}

/**
 * Expand the current selection by one character to the right (include one more
 * code unit after the range end). End offset is exclusive.
 */
export function nudgeSelectionExpandRight(root: HTMLElement): boolean {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount !== 1) return false;
  const range = sel.getRangeAt(0);
  if (range.collapsed) return false;
  if (!root.contains(range.commonAncestorContainer)) return false;

  const end = range.endContainer;
  if (end.nodeType !== Node.TEXT_NODE) return false;
  const en = end as Text;
  const eo = range.endOffset;

  const r = range.cloneRange();
  const texts = collectTextNodes(root);

  if (eo < en.data.length) {
    const newEnd = utf16NextIndex(en.data, eo);
    if (newEnd <= eo) return false;
    r.setEnd(en, newEnd);
    sel.removeAllRanges();
    sel.addRange(r);
    return true;
  }

  const idx = texts.indexOf(en);
  if (idx < 0 || idx >= texts.length - 1) return false;
  const next = texts[idx + 1]!;
  if (!next.data.length) return false;
  const newEnd = utf16NextIndex(next.data, 0);
  r.setEnd(next, newEnd);
  sel.removeAllRanges();
  sel.addRange(r);
  return true;
}
