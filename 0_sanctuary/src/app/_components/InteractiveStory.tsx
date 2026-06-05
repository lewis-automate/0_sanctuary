"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  useCallback,
  useEffect,
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
  isReaderVocabSelectionWithinLimit,
  MAX_READER_GRAMMAR_SELECTION_GRAPHEMES,
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
  /** From profile; both required for grammar help */
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
  text: string;
} | null;

const TOOLBAR_CLUSTER =
  "flex shrink-0 items-center rounded-full border border-[var(--border-default)] bg-[var(--surface-elevated)] p-1 shadow-inner";

const TOOLBAR_ICON_BTN =
  "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--reader-control-border)] bg-[var(--reader-control-bg)] text-[var(--reader-control-icon)] shadow-sm transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-panel-solid)] active:opacity-90 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:bg-[var(--reader-control-bg)]";

const TOOLBAR_SAVE_BTN =
  "inline-flex h-10 min-w-[3.5rem] shrink-0 items-center justify-center rounded-full border border-[var(--reader-control-border)] bg-[var(--reader-control-bg)] px-3 text-xs font-semibold tracking-wide text-[var(--reader-control-icon)] shadow-sm transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-panel-solid)] active:opacity-90 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:bg-[var(--reader-control-bg)]";

export function InteractiveStory({
  story,
  fontSize = "md",
  targetLanguage = "",
  nativeLanguage = "",
}: Props) {
  const router = useRouter();
  const [tooltip, setTooltip] = useState<TooltipState>(null);
  const [grammarOpen, setGrammarOpen] = useState(false);
  const [grammarLoading, setGrammarLoading] = useState(false);
  const [grammarText, setGrammarText] = useState("");
  const [grammarError, setGrammarError] = useState<string | null>(null);
  const [grammarHighlight, setGrammarHighlight] = useState("");
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
  const selectionDockRef = useRef<HTMLDivElement>(null);
  const [portalReady, setPortalReady] = useState(false);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  const showTooltipFromSelection = useCallback(() => {
    requestAnimationFrame(() => {
      const selection = window.getSelection();
      if (!selection) return;
      const text = selection.toString().trim();

      const anchor = selection.anchorNode;
      if (!text || !containerRef.current || !anchor || !containerRef.current.contains(anchor)) {
        if (grammarOpen) return;
        setTooltip(null);
        return;
      }

      setTooltip({ text });
    });
  }, [grammarOpen]);

  const closeGrammarPanel = useCallback(() => {
    setGrammarOpen(false);
    setGrammarError(null);
    requestAnimationFrame(() => showTooltipFromSelection());
  }, [showTooltipFromSelection]);

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
      if (target && selectionDockRef.current?.contains(target)) return;
      setGrammarOpen(false);
      setGrammarError(null);
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

  const grammarSelectionWithinLimit = Boolean(
    tooltip?.text && isReaderGrammarSelectionWithinLimit(tooltip.text),
  );
  const vocabSelectionWithinLimit = Boolean(
    tooltip?.text && isReaderVocabSelectionWithinLimit(tooltip.text),
  );
  const canGrammar =
    Boolean(targetLanguage.trim() && nativeLanguage.trim()) &&
    Boolean(tooltip?.text) &&
    grammarSelectionWithinLimit;
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

  const handleGrammar = useCallback(async () => {
    if (!tooltip?.text.trim() || !isReaderGrammarSelectionWithinLimit(tooltip.text))
      return;
    const highlight = tooltip.text;
    setGrammarHighlight(highlight);
    setGrammarOpen(true);
    setGrammarLoading(true);
    setGrammarError(null);
    setGrammarText("");
    const context = buildSelectionContext(story.body, highlight);
    try {
      const res = await fetch("/api/grammar-selection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: highlight,
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
              {grammarOpen && tooltip && (
                <motion.div
                  key="reader-grammar-backdrop"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-[54] bg-black/25"
                  aria-hidden
                >
                  <button
                    type="button"
                    className="absolute inset-0"
                    aria-label="Close grammar panel"
                    onClick={closeGrammarPanel}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {tooltip && (
                <motion.div
                  key="reader-selection-dock"
                  ref={selectionDockRef}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 12 }}
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  className="fixed inset-x-0 bottom-0 z-[55] mx-auto w-full max-w-md px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
                  onMouseDown={(e) => e.stopPropagation()}
                  onTouchStart={(e) => e.stopPropagation()}
                >
                  <div className="overflow-hidden rounded-t-2xl border border-[var(--reader-border-muted)] bg-[var(--reader-surface)] shadow-2xl backdrop-blur-xl">
                    <AnimatePresence initial={false}>
                      {grammarOpen && (
                        <motion.div
                          key="reader-grammar-panel"
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ type: "spring", stiffness: 420, damping: 36 }}
                          className="overflow-hidden border-b border-[var(--border-default)]"
                        >
                          <div className="flex max-h-[min(45vh,28rem)] flex-col">
                            <div className="flex shrink-0 items-start justify-between gap-3 px-4 py-3">
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-[var(--foreground)]">
                                  Grammar
                                </p>
                                {grammarHighlight ? (
                                  <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[var(--text-muted)]">
                                    “{grammarHighlight}”
                                  </p>
                                ) : null}
                              </div>
                              <button
                                type="button"
                                onClick={closeGrammarPanel}
                                className="shrink-0 rounded-full px-2 py-1 text-xs font-medium text-[var(--text-muted)] hover:bg-[var(--nav-hover-bg)]"
                              >
                                Close
                              </button>
                            </div>
                            <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-3">
                              {grammarLoading && (
                                <div className="space-y-1">
                                  <p className="text-sm text-[var(--text-muted)]">
                                    Getting a grammar note…
                                  </p>
                                  <p className="text-xs text-[var(--field-placeholder)]">
                                    {READER_AI_WAIT_HINT}
                                  </p>
                                </div>
                              )}
                              {!grammarLoading && grammarError && (
                                <p className="text-sm text-[var(--semantic-danger-inline)]">
                                  {grammarError}
                                </p>
                              )}
                              {!grammarLoading && !grammarError && grammarText && (
                                <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--foreground)]">
                                  {grammarText}
                                </p>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="flex justify-center p-2">
                      <div className="relative flex min-w-0 items-center justify-center">
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
                              if (grammarOpen) {
                                closeGrammarPanel();
                                return;
                              }
                              void handleGrammar();
                            }}
                            className={`${TOOLBAR_SAVE_BTN} ${
                              grammarOpen
                                ? "border-[var(--nav-active-bg)] bg-[var(--nav-active-bg)] text-[var(--nav-active-fg)]"
                                : ""
                            }`}
                            aria-label="Grammar"
                            aria-pressed={grammarOpen}
                          >
                            Grammar
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
                    </div>
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

