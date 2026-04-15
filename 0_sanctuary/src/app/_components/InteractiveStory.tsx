"use client";

import { ChevronLeft, ChevronRight, Languages, Lightbulb } from "lucide-react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import type { Story } from "../_data/stories";
import { queueProgressUpdate } from "../reader/actions";
import {
  nudgeSelectionExpandRight,
  nudgeSelectionShrinkFromRight,
} from "@/lib/nudge-text-selection";
import {
  isReaderGrammarSelectionWithinLimit,
  isReaderTranslateSelectionWithinLimit,
  isReaderVocabSelectionWithinLimit,
  MAX_READER_GRAMMAR_SELECTION_GRAPHEMES,
  MAX_READER_TRANSLATE_SELECTION_GRAPHEMES,
  MAX_READER_VOCAB_SELECTION_GRAPHEMES,
} from "@/lib/reader-selection-limit";

type FontSize = "sm" | "md" | "lg";

const FONT_CLASSES: Record<FontSize, string> = {
  sm: "text-base leading-7",
  md: "text-lg leading-8",
  lg: "text-xl leading-9",
};

const READER_AI_WAIT_HINT = "Wait a moment...";

type Props = {
  story: Story;
  fontSize?: FontSize;
  /** From profile; both required for translate */
  targetLanguage?: string;
  nativeLanguage?: string;
};

function buildSelectionContext(storyBody: string, highlighted: string): string {
  const trimmed = highlighted.trim();
  if (!trimmed) return "";
  const paragraphs = storyBody.split(/\n\n/);
  const collapsedHighlight = trimmed.replace(/\s+/g, " ");
  for (const p of paragraphs) {
    const collapsedP = p.replace(/\s+/g, " ");
    if (p.includes(trimmed) || collapsedP.includes(collapsedHighlight)) {
      return p.trim();
    }
  }
  const idx = storyBody.indexOf(trimmed);
  if (idx === -1) {
    return storyBody.slice(0, Math.min(500, storyBody.length)).trim();
  }
  const pad = 100;
  const start = Math.max(0, idx - pad);
  const end = Math.min(storyBody.length, idx + trimmed.length + pad);
  return storyBody.slice(start, end).trim();
}

type TooltipState = {
  /** Horizontal center of the selection (viewport px) */
  centerX: number;
  top: number;
  bottom: number;
  width: number;
  text: string;
} | null;

type TranslateAnchor = {
  centerX: number;
  top: number;
  bottom: number;
  width: number;
};

const TEXT_MARGIN_PX = 8;

const TOOLBAR_CLUSTER =
  "flex shrink-0 items-center rounded-full border border-[var(--border-default)] bg-[var(--surface-elevated)] p-1 shadow-inner";

const TOOLBAR_ICON_BTN =
  "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--reader-control-border)] bg-[var(--reader-control-bg)] text-[var(--reader-control-icon)] shadow-sm transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-panel-solid)] active:opacity-90 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:bg-[var(--reader-control-bg)]";

const TOOLBAR_SAVE_BTN =
  "inline-flex h-10 min-w-[3.5rem] shrink-0 items-center justify-center rounded-full border border-[var(--reader-control-border)] bg-[var(--reader-control-bg)] px-3 text-xs font-semibold tracking-wide text-[var(--reader-control-icon)] shadow-sm transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-panel-solid)] active:opacity-90 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:bg-[var(--reader-control-bg)]";

function clampLeftForCenteredWidth(
  centerX: number,
  width: number,
  bounds: DOMRect,
  margin: number,
): number {
  const half = width / 2;
  const idealLeft = centerX - half;
  const minL = bounds.left + margin;
  const maxL = bounds.right - margin - width;
  if (maxL < minL) return minL;
  return Math.min(Math.max(idealLeft, minL), maxL);
}

export function InteractiveStory({
  story,
  fontSize = "md",
  targetLanguage = "",
  nativeLanguage = "",
}: Props) {
  const router = useRouter();
  const [tooltip, setTooltip] = useState<TooltipState>(null);
  const [translateOpen, setTranslateOpen] = useState(false);
  const [translateLoading, setTranslateLoading] = useState(false);
  const [translateText, setTranslateText] = useState("");
  const [translateSynonym, setTranslateSynonym] = useState("");
  const [translateError, setTranslateError] = useState<string | null>(null);
  const [grammarOpen, setGrammarOpen] = useState(false);
  const [grammarLoading, setGrammarLoading] = useState(false);
  const [grammarText, setGrammarText] = useState("");
  const [grammarError, setGrammarError] = useState<string | null>(null);
  const [translateAnchor, setTranslateAnchor] = useState<TranslateAnchor | null>(
    null,
  );
  const [translatePlacement, setTranslatePlacement] = useState<"below" | "above">(
    "below",
  );
  const [savedVocab, setSavedVocab] = useState<string[]>([]);
  /** Floating toast after Save (not shown in the highlight toolbar) */
  const [vocabToast, setVocabToast] = useState<"saved" | "duplicate" | null>(
    null,
  );
  const [thoughts, setThoughts] = useState("");
  const [difficulty, setDifficulty] = useState<number | null>(null);
  const [engagement, setEngagement] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const translatePopupRef = useRef<HTMLDivElement>(null);
  const [portalReady, setPortalReady] = useState(false);
  /** Re-read text-area bounds on scroll/resize while overlays are open */
  const [layoutTick, setLayoutTick] = useState(0);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  useEffect(() => {
    if (!tooltip && !translateOpen && !grammarOpen) return;
    const bump = () => setLayoutTick((n) => n + 1);
    window.addEventListener("scroll", bump, true);
    window.addEventListener("resize", bump);
    return () => {
      window.removeEventListener("scroll", bump, true);
      window.removeEventListener("resize", bump);
    };
  }, [tooltip, translateOpen, grammarOpen]);

  const handleFinishedReading = useCallback(async () => {
    setSaveError(null);
    setSaving(true);
    const result = await queueProgressUpdate({
      story_id: story.id,
      saved_vocab: savedVocab,
      thoughts,
      difficulty,
      engagement,
    });
    if (result.ok) {
      router.push("/continue");
    } else {
      setSaving(false);
      setSaveError(result.error ?? "Failed to save progress");
    }
  }, [story.id, savedVocab, thoughts, difficulty, engagement, router]);

  useEffect(() => {
    if (!tooltip) return;
    const dismiss = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node | null;
      if (target && tooltipRef.current?.contains(target)) return;
      if (target && translatePopupRef.current?.contains(target)) return;
      setTooltip(null);
      window.getSelection()?.removeAllRanges();
    };
    const handleMouseDown = (e: MouseEvent) => dismiss(e);
    const handleTouchStart = (e: TouchEvent) => dismiss(e);
    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("touchstart", handleTouchStart, { passive: true });
    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("touchstart", handleTouchStart);
    };
  }, [tooltip]);

  useEffect(() => {
    if (!vocabToast) return;
    const id = window.setTimeout(() => setVocabToast(null), 2400);
    return () => window.clearTimeout(id);
  }, [vocabToast]);

  const showTooltipFromSelection = useCallback(() => {
    // Read after layout so getBoundingClientRect matches the committed selection
    // (especially important on mobile after drag-to-select).
    requestAnimationFrame(() => {
      const selection = window.getSelection();
      if (!selection) return;
      const text = selection.toString().trim();

      const anchor = selection.anchorNode;
      if (!text || !containerRef.current || !anchor || !containerRef.current.contains(anchor)) {
        // Tapping Translate/Grammar often collapses selection; keep the bar until the panel closes.
        if (translateOpen || grammarOpen) return;
        setTooltip(null);
        return;
      }

      const range = selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
      const rect = range?.getBoundingClientRect();
      if (!rect) return;

      setTooltip({
        centerX: rect.left + rect.width / 2,
        top: rect.top,
        bottom: rect.bottom,
        width: rect.width,
        text,
      });
    });
  }, [translateOpen, grammarOpen]);

  // Touches that end on selection handles (common on Android) do not bubble
  // touchend to the article, but selectionchange still fires when the range updates.
  useEffect(() => {
    let debounceId: ReturnType<typeof setTimeout> | undefined;
    const onSelectionChange = () => {
      if (debounceId !== undefined) clearTimeout(debounceId);
      debounceId = setTimeout(() => {
        debounceId = undefined;
        showTooltipFromSelection();
      }, 100);
    };
    document.addEventListener("selectionchange", onSelectionChange);
    return () => {
      document.removeEventListener("selectionchange", onSelectionChange);
      if (debounceId !== undefined) clearTimeout(debounceId);
    };
  }, [showTooltipFromSelection]);

  // Desktop: selection is available on mouseup. Mobile: backup when touchend
  // reaches the article (tap-to-select); drag handles rely on selectionchange.
  const handleMouseUp = useCallback(() => {
    showTooltipFromSelection();
  }, [showTooltipFromSelection]);

  const handleTouchEnd = useCallback(() => {
    setTimeout(showTooltipFromSelection, 150);
  }, [showTooltipFromSelection]);

  const handleNudgeSelectionLeft = useCallback(() => {
    if (!containerRef.current) return;
    nudgeSelectionShrinkFromRight(containerRef.current);
    requestAnimationFrame(() => showTooltipFromSelection());
  }, [showTooltipFromSelection]);

  const handleNudgeSelectionRight = useCallback(() => {
    if (!containerRef.current) return;
    if (!nudgeSelectionExpandRight(containerRef.current)) return;
    requestAnimationFrame(() => showTooltipFromSelection());
  }, [showTooltipFromSelection]);

  const handleSaveVocab = useCallback(() => {
    if (!tooltip || !isReaderVocabSelectionWithinLimit(tooltip.text)) return;
    const text = tooltip.text;
    setSavedVocab((prev) => {
      if (prev.includes(text)) {
        queueMicrotask(() => {
          setVocabToast("duplicate");
          window.getSelection()?.removeAllRanges();
          setTooltip(null);
        });
        return prev;
      }
      if (prev.length >= 15) return prev;
      queueMicrotask(() => {
        setVocabToast("saved");
        window.getSelection()?.removeAllRanges();
        setTooltip(null);
      });
      return [...prev, text];
    });
  }, [tooltip]);

  const handleRemoveVocab = useCallback((word: string) => {
    setSavedVocab((prev) => prev.filter((w) => w !== word));
  }, []);

  const translateSelectionWithinLimit = Boolean(
    tooltip?.text && isReaderTranslateSelectionWithinLimit(tooltip.text),
  );
  const grammarSelectionWithinLimit = Boolean(
    tooltip?.text && isReaderGrammarSelectionWithinLimit(tooltip.text),
  );
  const vocabSelectionWithinLimit = Boolean(
    tooltip?.text && isReaderVocabSelectionWithinLimit(tooltip.text),
  );
  const canTranslate =
    Boolean(targetLanguage.trim() && nativeLanguage.trim()) &&
    Boolean(tooltip?.text) &&
    translateSelectionWithinLimit;
  const canGrammar =
    Boolean(targetLanguage.trim() && nativeLanguage.trim()) &&
    Boolean(tooltip?.text) &&
    grammarSelectionWithinLimit;
  const translateDisabledTitle = !translateSelectionWithinLimit
    ? `Selection too long for Translate (max ${MAX_READER_TRANSLATE_SELECTION_GRAPHEMES} characters)—shorten with the arrows`
    : !targetLanguage.trim() || !nativeLanguage.trim()
      ? "Add target and native language in Settings"
      : undefined;
  const grammarDisabledTitle = !grammarSelectionWithinLimit
    ? `Selection too long for Grammar (max ${MAX_READER_GRAMMAR_SELECTION_GRAPHEMES} characters)—shorten with the arrows`
    : !targetLanguage.trim() || !nativeLanguage.trim()
      ? "Add target and native language in Settings"
      : undefined;
  const selectionAlreadyInVocab = Boolean(
    tooltip?.text && savedVocab.includes(tooltip.text),
  );
  const canSaveToVocab =
    vocabSelectionWithinLimit &&
    (savedVocab.length < 15 || selectionAlreadyInVocab);

  const handleTranslate = useCallback(async () => {
    if (!tooltip?.text.trim() || !isReaderTranslateSelectionWithinLimit(tooltip.text))
      return;
    setTranslateAnchor({
      centerX: tooltip.centerX,
      top: tooltip.top,
      bottom: tooltip.bottom,
      width: tooltip.width,
    });
    setGrammarOpen(false);
    setGrammarError(null);
    setTranslateOpen(true);
    setTranslateLoading(true);
    setTranslateError(null);
    setTranslateText("");
    setTranslateSynonym("");
    const context = buildSelectionContext(story.body, tooltip.text);
    try {
      const res = await fetch("/api/translate-selection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: tooltip.text,
          context,
        }),
      });
      const data = (await res.json()) as {
        translation?: unknown;
        synonym?: unknown;
        error?: string;
      };
      if (!res.ok) {
        setTranslateError(data.error ?? "Translation failed");
        return;
      }
      const raw =
        typeof data.translation === "string" ? data.translation.trim() : "";
      const syn =
        typeof data.synonym === "string" ? data.synonym.trim() : "";
      if (raw) {
        setTranslateText(raw);
        setTranslateSynonym(syn);
      } else {
        setTranslateError("No translation returned");
      }
    } catch {
      setTranslateError("Could not reach translator");
    } finally {
      setTranslateLoading(false);
    }
  }, [story.body, tooltip]);

  const handleGrammar = useCallback(async () => {
    if (!tooltip?.text.trim() || !isReaderGrammarSelectionWithinLimit(tooltip.text))
      return;
    setTranslateAnchor({
      centerX: tooltip.centerX,
      top: tooltip.top,
      bottom: tooltip.bottom,
      width: tooltip.width,
    });
    setTranslateOpen(false);
    setTranslateError(null);
    setGrammarOpen(true);
    setGrammarLoading(true);
    setGrammarError(null);
    setGrammarText("");
    const context = buildSelectionContext(story.body, tooltip.text);
    try {
      const res = await fetch("/api/grammar-selection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: tooltip.text,
          context,
        }),
      });
      const data = (await res.json()) as {
        explanation?: unknown;
        error?: string;
      };
      if (!res.ok) {
        setGrammarError(data.error ?? "Grammar help failed");
        return;
      }
      const raw =
        typeof data.explanation === "string" ? data.explanation.trim() : "";
      if (raw) {
        setGrammarText(raw);
      } else {
        setGrammarError("No explanation returned");
      }
    } catch {
      setGrammarError("Could not reach grammar helper");
    } finally {
      setGrammarLoading(false);
    }
  }, [story.body, tooltip]);

  useLayoutEffect(() => {
    if ((!translateOpen && !grammarOpen) || !translateAnchor) return;
    const el = translatePopupRef.current;
    if (!el) return;

    const measure = () => {
      const h = el.getBoundingClientRect().height;
      const gap = 8;
      const spaceBelow = window.innerHeight - translateAnchor.bottom - gap;
      const spaceAbove = translateAnchor.top - gap;
      if (spaceBelow >= h) {
        setTranslatePlacement("below");
      } else if (spaceAbove >= h) {
        setTranslatePlacement("above");
      } else {
        setTranslatePlacement(spaceAbove > spaceBelow ? "above" : "below");
      }
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [
    translateOpen,
    grammarOpen,
    translateAnchor,
    translateLoading,
    grammarLoading,
    translateText,
    translateSynonym,
    translateError,
    grammarText,
    grammarError,
  ]);

  return (
    <>
      <div
        ref={containerRef}
        role="article"
        className={`mt-8 select-text space-y-6 text-[var(--prose-text)] ${FONT_CLASSES[fontSize]}`}
        onMouseUp={handleMouseUp}
        onTouchEnd={handleTouchEnd}
      >
        {story.body.split("\n\n").map((paragraph, i) => (
          <p key={i}>{paragraph}</p>
        ))}
      </div>

      <section className="mt-10 space-y-4 border-t border-[var(--border-default)] pt-6">
        <div>
          <label className="block text-xs font-medium uppercase tracking-[0.16em] text-[var(--text-muted)]">
            Saved Vocab
          </label>
          <div className="mt-2 flex flex-wrap gap-2 rounded-2xl border border-[var(--border-default)] bg-[var(--field-bg)] p-4">
            {savedVocab.length === 0 ? (
              <span className="text-sm text-[var(--field-placeholder)]">
                Select words to save them here.
              </span>
            ) : (
              savedVocab.map((word) => (
                <motion.span
                  key={word}
                  layout
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  className="inline-flex items-center gap-1 rounded-full border border-[var(--border-default)] bg-[var(--surface-panel-solid)] px-2.5 py-1 text-sm text-[var(--foreground)]"
                >
                  <span>{word}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveVocab(word)}
                    className="rounded-full p-0.5 text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-elevated)] hover:text-[var(--foreground)]"
                    aria-label={`Remove ${word}`}
                  >
                    ×
                  </button>
                </motion.span>
              ))
            )}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium uppercase tracking-[0.16em] text-[var(--text-muted)]">
            Thoughts
          </label>
          <div className="relative mt-2">
            <textarea
              rows={4}
              maxLength={500}
              value={thoughts}
              onChange={(e) => setThoughts(e.target.value)}
              placeholder="Share anything that comes to mind or summarize the story in a few sentences."
              className="w-full resize-none rounded-3xl border border-[var(--field-border)] bg-[var(--field-bg)] px-3 py-3 pb-8 text-sm leading-relaxed text-[var(--field-text)] placeholder:text-[var(--field-placeholder)] focus:border-[var(--border-strong)] focus:outline-none focus:ring-0"
            />
            <span className="absolute bottom-3 right-3 text-xs text-[var(--field-placeholder)]">
              {thoughts.length}/500
            </span>
          </div>
        </div>

        <div className="grid gap-4 text-sm text-[var(--prose-text)] sm:grid-cols-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--text-muted)]">
              Difficulty
            </span>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setDifficulty((d) => (d === value ? null : value))}
                  className={`flex h-7 w-7 items-center justify-center rounded-full border text-xs font-medium transition-colors ${
                    difficulty === value
                      ? "border-[var(--nav-active-bg)] bg-[var(--nav-active-bg)] text-[var(--nav-active-fg)]"
                      : "border-[var(--border-strong)] bg-[var(--field-bg)] text-[var(--foreground)] hover:border-[var(--foreground)]"
                  }`}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--text-muted)]">
              Engagement
            </span>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setEngagement((e) => (e === value ? null : value))}
                  className={`flex h-7 w-7 items-center justify-center rounded-full border text-xs font-medium transition-colors ${
                    engagement === value
                      ? "border-[var(--nav-active-bg)] bg-[var(--nav-active-bg)] text-[var(--nav-active-fg)]"
                      : "border-[var(--border-strong)] bg-[var(--field-bg)] text-[var(--foreground)] hover:border-[var(--foreground)]"
                  }`}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>
        </div>

        {saveError && (
          <p className="mt-4 text-sm text-[var(--semantic-danger-inline)]">{saveError}</p>
        )}
        <button
          type="button"
          disabled={saving}
          onClick={handleFinishedReading}
          className="mt-6 w-full rounded-2xl bg-[var(--nav-active-bg)] py-3 text-sm font-medium text-[var(--nav-active-fg)] transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "Saving progress…" : "I have finished reading"}
        </button>
      </section>

      {portalReady &&
        createPortal(
          <>
            <AnimatePresence>
              {tooltip && (
                <div
                  ref={tooltipRef}
                  className="fixed z-50 before:pointer-events-auto before:absolute before:inset-[-16px] before:z-0 before:rounded-full before:content-['']"
                  onMouseDown={(e) => e.stopPropagation()}
                  onTouchStart={(e) => e.stopPropagation()}
                  style={{
                    left: "50%",
                    top: tooltip.top - 8,
                    transform: "translate(-50%, -100%)",
                  }}
                >
                  {/* Inner full-bleed layer: flex gaps can miss hit-testing; this catches mousedown behind the row. */}
                  <motion.div
                    className="relative z-10 rounded-full border border-[var(--border-default)] bg-[var(--surface-panel)]/90 p-2 shadow-lg ring-1 ring-[var(--border-default)] backdrop-blur-sm"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{
                      opacity: 0,
                      scale: 1.15,
                      transition: { duration: 0.2, ease: "easeOut" },
                    }}
                  >
                    <div
                      className="pointer-events-auto absolute inset-0 z-0 rounded-full bg-[var(--surface-panel)]/90"
                      aria-hidden
                    />
                    <div className="relative z-10 flex min-w-0 items-center">
                    {/* Spacers instead of flex gap so clicks in “between” hit a real node (gap can pass through). */}
                    <div className={TOOLBAR_CLUSTER}>
                      <button
                        type="button"
                        title="Remove one character from the right"
                        aria-label="Remove one character from the right side of the selection"
                        onPointerDown={(e) => e.preventDefault()}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleNudgeSelectionLeft();
                        }}
                        className={TOOLBAR_ICON_BTN}
                      >
                        <ChevronLeft className="h-5 w-5" strokeWidth={2} aria-hidden />
                      </button>
                    </div>
                    <div className="w-3 shrink-0 self-stretch" aria-hidden />
                    <div className={`${TOOLBAR_CLUSTER} flex items-center`}>
                      <button
                        type="button"
                        disabled={!canTranslate}
                        title={translateDisabledTitle ?? "Translate"}
                        onPointerDown={(e) => e.preventDefault()}
                        onClick={(e) => {
                          e.stopPropagation();
                          void handleTranslate();
                        }}
                        className={TOOLBAR_ICON_BTN}
                        aria-label="Translate"
                      >
                        <Languages className="h-5 w-5" strokeWidth={2} aria-hidden />
                      </button>
                      <div className="w-1.5 shrink-0 self-stretch" aria-hidden />
                      <button
                        type="button"
                        title={
                          !vocabSelectionWithinLimit
                            ? `Selection too long for Save (max ${MAX_READER_VOCAB_SELECTION_GRAPHEMES} characters)—shorten with the arrows`
                            : savedVocab.length >= 15 && !selectionAlreadyInVocab
                              ? "Saved vocab limit reached (15)"
                              : selectionAlreadyInVocab
                                ? "Already in your list"
                                : "Save to vocab list"
                        }
                        onPointerDown={(e) => e.preventDefault()}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSaveVocab();
                        }}
                        disabled={!canSaveToVocab}
                        className={TOOLBAR_SAVE_BTN}
                        aria-label="Save to vocab list"
                      >
                        Save
                      </button>
                      <div className="w-1.5 shrink-0 self-stretch" aria-hidden />
                      <button
                        type="button"
                        disabled={!canGrammar}
                        title={grammarDisabledTitle ?? "Grammar explanation"}
                        onPointerDown={(e) => e.preventDefault()}
                        onClick={(e) => {
                          e.stopPropagation();
                          void handleGrammar();
                        }}
                        className={TOOLBAR_ICON_BTN}
                        aria-label="Grammar explanation"
                      >
                        <Lightbulb className="h-5 w-5" strokeWidth={2} aria-hidden />
                      </button>
                    </div>
                    <div className="w-3 shrink-0 self-stretch" aria-hidden />
                    <div className={TOOLBAR_CLUSTER}>
                      <button
                        type="button"
                        title="Add one character on the right"
                        aria-label="Add one character to the right side of the selection"
                        onPointerDown={(e) => e.preventDefault()}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleNudgeSelectionRight();
                        }}
                        className={TOOLBAR_ICON_BTN}
                      >
                        <ChevronRight className="h-5 w-5" strokeWidth={2} aria-hidden />
                      </button>
                    </div>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {(translateOpen || grammarOpen) && translateAnchor && (
                <motion.div
                  key="reader-ai-popover"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-[54]"
                  aria-hidden={!(translateOpen || grammarOpen)}
                >
                  <button
                    type="button"
                    className="absolute inset-0 bg-black/25"
                    aria-label="Close panel"
                    onClick={() => {
                      setTranslateOpen(false);
                      setTranslateError(null);
                      setGrammarOpen(false);
                      setGrammarError(null);
                      setTranslateAnchor(null);
                      requestAnimationFrame(() => showTooltipFromSelection());
                    }}
                  />
                  {/* Horizontally clamped to the story text column (not full viewport). */}
                  <div
                    ref={translatePopupRef}
                    style={(() => {
                      void layoutTick;
                      const vw =
                        typeof window !== "undefined" ? window.innerWidth : 400;
                      const bounds = containerRef.current?.getBoundingClientRect();
                      let panelWidth = Math.min(
                        Math.max(translateAnchor.width + 48, 200),
                        Math.min(vw * 0.92, 640),
                      );
                      let left: number;
                      if (bounds) {
                        const innerMax = bounds.width - 2 * TEXT_MARGIN_PX;
                        if (innerMax > 0) {
                          panelWidth = Math.min(panelWidth, innerMax);
                        }
                        left = clampLeftForCenteredWidth(
                          translateAnchor.centerX,
                          panelWidth,
                          bounds,
                          TEXT_MARGIN_PX,
                        );
                      } else {
                        left = Math.min(
                          Math.max(translateAnchor.centerX - panelWidth / 2, 8),
                          Math.max(8, vw - panelWidth - 8),
                        );
                      }
                      return {
                        position: "fixed" as const,
                        left,
                        width: panelWidth,
                        zIndex: 55,
                        ...(translatePlacement === "below"
                          ? { top: translateAnchor.bottom + 8 }
                          : {
                              bottom:
                                typeof window !== "undefined"
                                  ? window.innerHeight - translateAnchor.top + 8
                                  : undefined,
                            }),
                      };
                    })()}
                    className="flex max-h-[min(50vh,28rem)] flex-col overflow-hidden"
                  >
                    <motion.div
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      transition={{ type: "spring", stiffness: 520, damping: 32 }}
                      style={{ transformOrigin: "top center" }}
                      className="flex max-h-[min(50vh,28rem)] min-h-0 flex-col overflow-hidden rounded-2xl border border-[var(--reader-border-muted)] bg-[var(--reader-surface)] shadow-2xl backdrop-blur-xl"
                    >
                      <div className="flex shrink-0 items-center justify-between border-b border-[var(--border-default)] px-4 py-3">
                        <span className="text-sm font-semibold text-[var(--foreground)]">
                          {translateOpen ? "Translation" : "Grammar"}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setTranslateOpen(false);
                            setTranslateError(null);
                            setGrammarOpen(false);
                            setGrammarError(null);
                            setTranslateAnchor(null);
                            requestAnimationFrame(() => showTooltipFromSelection());
                          }}
                          className="rounded-full px-2 py-1 text-xs font-medium text-[var(--text-muted)] hover:bg-[var(--nav-hover-bg)]"
                        >
                          Close
                        </button>
                      </div>
                      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 pt-2">
                        {translateOpen && translateLoading && (
                          <div className="space-y-1">
                            <p className="text-sm text-[var(--text-muted)]">
                              Translating…
                            </p>
                            <p className="text-xs text-[var(--field-placeholder)]">
                              {READER_AI_WAIT_HINT}
                            </p>
                          </div>
                        )}
                        {grammarOpen && grammarLoading && (
                          <div className="space-y-1">
                            <p className="text-sm text-[var(--text-muted)]">
                              Getting a grammar note…
                            </p>
                            <p className="text-xs text-[var(--field-placeholder)]">
                              {READER_AI_WAIT_HINT}
                            </p>
                          </div>
                        )}
                        {translateOpen && !translateLoading && translateError && (
                          <p className="text-sm text-[var(--semantic-danger-inline)]">{translateError}</p>
                        )}
                        {grammarOpen && !grammarLoading && grammarError && (
                          <p className="text-sm text-[var(--semantic-danger-inline)]">{grammarError}</p>
                        )}
                        {translateOpen &&
                          !translateLoading &&
                          !translateError &&
                          translateText && (
                            <div className="space-y-2">
                              <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--foreground)]">
                                {translateText}
                              </p>
                              {translateSynonym ? (
                                <p className="text-sm leading-relaxed text-[var(--prose-text)]">
                                  {translateSynonym}
                                </p>
                              ) : null}
                            </div>
                          )}
                        {grammarOpen &&
                          !grammarLoading &&
                          !grammarError &&
                          grammarText && (
                            <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--foreground)]">
                              {grammarText}
                            </p>
                          )}
                      </div>
                    </motion.div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <AnimatePresence>
              {vocabToast && (
                <motion.div
                  key={vocabToast}
                  role="status"
                  aria-live="polite"
                  initial={{ opacity: 0, y: 16, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{
                    opacity: 0,
                    y: 10,
                    scale: 0.98,
                    transition: { duration: 0.28, ease: "easeIn" },
                  }}
                  transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                  className="pointer-events-none fixed bottom-[calc(1.25rem+env(safe-area-inset-bottom,0px))] left-1/2 z-[60] flex max-w-[min(90vw,20rem)] -translate-x-1/2 items-center gap-2 rounded-2xl border border-[var(--semantic-success-border)] bg-[var(--semantic-success-bg)] px-4 py-3 text-sm font-medium text-[var(--semantic-success-text)] shadow-lg shadow-black/10"
                >
                  <span
                    className="h-2 w-2 shrink-0 rounded-full bg-[var(--semantic-success-icon)]"
                    aria-hidden
                  />
                  {vocabToast === "saved" ? (
                    <span>Saved.</span>
                  ) : (
                    <span>Already saved.</span>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </>,
          document.body,
        )}
    </>
  );
}

