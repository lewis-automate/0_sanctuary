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
  isReaderSelectionWithinLimit,
  MAX_READER_SELECTION_GRAPHEMES,
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
  "flex shrink-0 items-center rounded-full border border-slate-600/75 bg-slate-900 p-1 shadow-inner";

const TOOLBAR_ICON_BTN =
  "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-500/55 bg-slate-800 text-[#FDFCFB] shadow-sm transition-colors hover:border-slate-400/70 hover:bg-slate-700 active:bg-slate-600 disabled:cursor-not-allowed disabled:border-slate-600 disabled:text-slate-500 disabled:opacity-55 disabled:hover:bg-slate-800";

const TOOLBAR_SAVE_BTN =
  "inline-flex h-10 min-w-[3.5rem] shrink-0 items-center justify-center rounded-full border border-slate-500/55 bg-slate-800 px-3 text-xs font-semibold tracking-wide text-[#FDFCFB] shadow-sm transition-colors hover:border-slate-400/70 hover:bg-slate-700 active:bg-slate-600 disabled:cursor-not-allowed disabled:border-slate-600 disabled:text-slate-500 disabled:opacity-55 disabled:hover:bg-slate-800";

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
    if (tooltip && isReaderSelectionWithinLimit(tooltip.text)) {
      setSavedVocab((prev) => {
        if (prev.includes(tooltip.text) || prev.length >= 15) return prev;
        return [...prev, tooltip.text];
      });
      window.getSelection()?.removeAllRanges();
      setTooltip(null);
    }
  }, [tooltip]);

  const handleRemoveVocab = useCallback((word: string) => {
    setSavedVocab((prev) => prev.filter((w) => w !== word));
  }, []);

  const selectionWithinLimit = Boolean(
    tooltip?.text && isReaderSelectionWithinLimit(tooltip.text),
  );
  const canUseReaderAi =
    Boolean(targetLanguage.trim() && nativeLanguage.trim()) &&
    Boolean(tooltip?.text) &&
    selectionWithinLimit;
  const readerAiDisabledTitle = !selectionWithinLimit
    ? `Selection too long (max ${MAX_READER_SELECTION_GRAPHEMES} characters)—shorten with the arrows`
    : !targetLanguage.trim() || !nativeLanguage.trim()
      ? "Add target and native language in Settings"
      : undefined;
  const canSaveToVocab =
    selectionWithinLimit && savedVocab.length < 15;

  const handleTranslate = useCallback(async () => {
    if (!tooltip?.text.trim() || !isReaderSelectionWithinLimit(tooltip.text)) return;
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
    if (!tooltip?.text.trim() || !isReaderSelectionWithinLimit(tooltip.text)) return;
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
        className={`mt-8 select-text space-y-6 text-slate-700 ${FONT_CLASSES[fontSize]}`}
        onMouseUp={handleMouseUp}
        onTouchEnd={handleTouchEnd}
      >
        {story.body.split("\n\n").map((paragraph, i) => (
          <p key={i}>{paragraph}</p>
        ))}
      </div>

      <section className="mt-10 space-y-4 border-t border-slate-200 pt-6">
        <div>
          <label className="block text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
            Saved Vocab
          </label>
          <div className="mt-2 flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white/60 p-4">
            {savedVocab.length === 0 ? (
              <span className="text-sm text-slate-400">
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
                  className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-sm text-slate-700"
                >
                  <span>{word}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveVocab(word)}
                    className="rounded-full p-0.5 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-900"
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
          <label className="block text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
            Thoughts
          </label>
          <div className="relative mt-2">
            <textarea
              rows={4}
              maxLength={500}
              value={thoughts}
              onChange={(e) => setThoughts(e.target.value)}
              placeholder="Share anything that comes to mind or summarize the story in a few sentences."
              className="w-full resize-none rounded-3xl border border-slate-200 bg-white/80 px-3 py-3 pb-8 text-sm leading-relaxed text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-0"
            />
            <span className="absolute bottom-3 right-3 text-xs text-slate-400">
              {thoughts.length}/500
            </span>
          </div>
        </div>

        <div className="grid gap-4 text-sm text-slate-700 sm:grid-cols-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
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
                      ? "border-slate-900 bg-slate-900 text-[#FDFCFB]"
                      : "border-slate-300 bg-white/80 text-slate-700 hover:border-slate-400"
                  }`}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
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
                      ? "border-slate-900 bg-slate-900 text-[#FDFCFB]"
                      : "border-slate-300 bg-white/80 text-slate-700 hover:border-slate-400"
                  }`}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>
        </div>

        {saveError && (
          <p className="mt-4 text-sm text-red-600">{saveError}</p>
        )}
        <button
          type="button"
          disabled={saving}
          onClick={handleFinishedReading}
          className="mt-6 w-full rounded-2xl bg-slate-900 py-3 text-sm font-medium text-[#FDFCFB] transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
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
                  className="fixed z-50"
                  onMouseDown={(e) => e.stopPropagation()}
                  onTouchStart={(e) => e.stopPropagation()}
                  style={{
                    left: "50%",
                    top: tooltip.top - 8,
                    transform: "translate(-50%, -100%)",
                  }}
                >
                  <motion.div
                    className="flex items-center gap-3 rounded-full border border-slate-600/60 bg-slate-950/40 p-2 shadow-lg ring-1 ring-slate-800/80 backdrop-blur-sm"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{
                      opacity: 0,
                      scale: 1.15,
                      transition: { duration: 0.2, ease: "easeOut" },
                    }}
                  >
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
                    <div className={`${TOOLBAR_CLUSTER} gap-1.5`}>
                      <button
                        type="button"
                        disabled={!canUseReaderAi}
                        title={readerAiDisabledTitle ?? "Translate"}
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
                      <button
                        type="button"
                        title={
                          !selectionWithinLimit
                            ? `Selection too long (max ${MAX_READER_SELECTION_GRAPHEMES} characters)—shorten with the arrows`
                            : savedVocab.length >= 15
                              ? "Saved vocab limit reached (15)"
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
                      <button
                        type="button"
                        disabled={!canUseReaderAi}
                        title={readerAiDisabledTitle ?? "Grammar explanation"}
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
                    className="absolute inset-0 bg-slate-900/20"
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
                      className="flex max-h-[min(50vh,28rem)] min-h-0 flex-col overflow-hidden rounded-2xl border border-white/40 bg-[#FDFCFB]/92 shadow-2xl backdrop-blur-xl supports-[backdrop-filter]:bg-[#FDFCFB]/88"
                    >
                      <div className="flex shrink-0 items-center justify-between border-b border-slate-200/60 px-4 py-3">
                        <span className="text-sm font-semibold text-slate-900">
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
                          className="rounded-full px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-900/5"
                        >
                          Close
                        </button>
                      </div>
                      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 pt-2">
                        {translateOpen && translateLoading && (
                          <div className="space-y-1">
                            <p className="text-sm text-slate-500">Translating…</p>
                            <p className="text-xs text-slate-400">
                              {READER_AI_WAIT_HINT}
                            </p>
                          </div>
                        )}
                        {grammarOpen && grammarLoading && (
                          <div className="space-y-1">
                            <p className="text-sm text-slate-500">
                              Getting a grammar note…
                            </p>
                            <p className="text-xs text-slate-400">
                              {READER_AI_WAIT_HINT}
                            </p>
                          </div>
                        )}
                        {translateOpen && !translateLoading && translateError && (
                          <p className="text-sm text-red-600">{translateError}</p>
                        )}
                        {grammarOpen && !grammarLoading && grammarError && (
                          <p className="text-sm text-red-600">{grammarError}</p>
                        )}
                        {translateOpen &&
                          !translateLoading &&
                          !translateError &&
                          translateText && (
                            <div className="space-y-2">
                              <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800">
                                {translateText}
                              </p>
                              {translateSynonym ? (
                                <p className="text-sm leading-relaxed text-slate-600">
                                  {translateSynonym}
                                </p>
                              ) : null}
                            </div>
                          )}
                        {grammarOpen &&
                          !grammarLoading &&
                          !grammarError &&
                          grammarText && (
                            <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800">
                              {grammarText}
                            </p>
                          )}
                      </div>
                    </motion.div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </>,
          document.body,
        )}
    </>
  );
}

