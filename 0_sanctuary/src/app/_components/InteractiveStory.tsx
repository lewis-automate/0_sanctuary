"use client";

import { ChevronLeft, ChevronRight, Languages, Lightbulb } from "lucide-react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import type { Story } from "../_data/stories";
import { queueProgressUpdate } from "../reader/actions";
import {
  getTapSelectionInParagraph,
  nudgeSelectionExpandRight,
  nudgeSelectionShrinkFromRight,
  withParagraphIndex,
  type ReaderTextSelection,
} from "@/lib/reader-custom-selection";
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
const TAP_MOVE_THRESHOLD_PX = 12;

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

const TOOLBAR_CLUSTER =
  "flex shrink-0 items-center rounded-full border border-[var(--border-default)] bg-[var(--surface-elevated)] p-1 shadow-inner";

const TOOLBAR_ICON_BTN =
  "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--reader-control-border)] bg-[var(--reader-control-bg)] text-[var(--reader-control-icon)] shadow-sm transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-panel-solid)] active:opacity-90 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:bg-[var(--reader-control-bg)]";

const TOOLBAR_ACTION_BTN =
  "inline-flex h-9 min-w-[2.75rem] shrink-0 items-center justify-center rounded-full border border-[var(--reader-control-border)] bg-[var(--reader-control-bg)] px-2.5 text-[11px] font-semibold tracking-wide text-[var(--reader-control-icon)] shadow-sm transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-panel-solid)] active:opacity-90 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:bg-[var(--reader-control-bg)]";

const READER_HIGHLIGHT_CLASS =
  "rounded-sm bg-[var(--reader-selection-bg)] text-[var(--reader-selection-fg)]";

function renderParagraphText(
  text: string,
  selection: ReaderTextSelection | null,
  paragraphIndex: number,
) {
  if (
    !selection ||
    selection.paragraphIndex !== paragraphIndex ||
    selection.start >= selection.end
  ) {
    return text;
  }
  const before = text.slice(0, selection.start);
  const highlighted = text.slice(selection.start, selection.end);
  const after = text.slice(selection.end);
  return (
    <>
      {before}
      <mark className={READER_HIGHLIGHT_CLASS}>{highlighted}</mark>
      {after}
    </>
  );
}

type SlidePanelProps = {
  title: string;
  highlight: string;
  onClose: () => void;
  loading: boolean;
  loadingLabel: string;
  error: string | null;
  body: string | null;
};

function ReaderSlidePanelContent({
  title,
  highlight,
  onClose,
  loading,
  loadingLabel,
  error,
  body,
}: SlidePanelProps) {
  return (
    <div className="flex max-h-[min(45vh,28rem)] flex-col">
        <div className="flex shrink-0 items-start justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[var(--foreground)]">
              {title}
            </p>
            {highlight ? (
              <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[var(--text-muted)]">
                “{highlight}”
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-full px-2 py-1 text-xs font-medium text-[var(--text-muted)] hover:bg-[var(--nav-hover-bg)]"
          >
            Close
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-3">
          {loading && (
            <div className="space-y-1">
              <p className="text-sm text-[var(--text-muted)]">{loadingLabel}</p>
              <p className="text-xs text-[var(--field-placeholder)]">
                {READER_AI_WAIT_HINT}
              </p>
            </div>
          )}
          {!loading && error && (
            <p className="text-sm text-[var(--semantic-danger-inline)]">
              {error}
            </p>
          )}
          {!loading && !error && body && (
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--foreground)]">
              {body}
            </p>
          )}
        </div>
    </div>
  );
}

export function InteractiveStory({
  story,
  fontSize = "md",
  targetLanguage = "",
  nativeLanguage = "",
}: Props) {
  const router = useRouter();
  const paragraphs = useMemo(() => story.body.split("\n\n"), [story.body]);
  const segmentLanguage = story.language || targetLanguage;

  const [selection, setSelection] = useState<ReaderTextSelection | null>(null);
  const [grammarOpen, setGrammarOpen] = useState(false);
  const [grammarLoading, setGrammarLoading] = useState(false);
  const [grammarText, setGrammarText] = useState("");
  const [grammarError, setGrammarError] = useState<string | null>(null);
  const [grammarHighlight, setGrammarHighlight] = useState("");
  const [translateOpen, setTranslateOpen] = useState(false);
  const [translateLoading, setTranslateLoading] = useState(false);
  const [translateText, setTranslateText] = useState("");
  const [translateError, setTranslateError] = useState<string | null>(null);
  const [translateHighlight, setTranslateHighlight] = useState("");
  const [savedVocab, setSavedVocab] = useState<string[]>([]);
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
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);
  const [portalReady, setPortalReady] = useState(false);

  const clearSelection = useCallback(() => {
    setSelection(null);
    setGrammarOpen(false);
    setGrammarError(null);
    setTranslateOpen(false);
    setTranslateError(null);
  }, []);

  const closeGrammarPanel = useCallback(() => {
    setGrammarOpen(false);
    setGrammarError(null);
  }, []);

  const closeTranslatePanel = useCallback(() => {
    setTranslateOpen(false);
    setTranslateError(null);
  }, []);

  const closeSlidePanels = useCallback(() => {
    closeGrammarPanel();
    closeTranslatePanel();
  }, [closeGrammarPanel, closeTranslatePanel]);

  useEffect(() => {
    setPortalReady(true);
  }, []);

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
    if (!selection) return;
    const dismiss = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node | null;
      if (target && selectionDockRef.current?.contains(target)) return;
      clearSelection();
    };
    document.addEventListener("mousedown", dismiss);
    document.addEventListener("touchstart", dismiss, { passive: true });
    return () => {
      document.removeEventListener("mousedown", dismiss);
      document.removeEventListener("touchstart", dismiss);
    };
  }, [selection, clearSelection]);

  useEffect(() => {
    if (!vocabToast) return;
    const id = window.setTimeout(() => setVocabToast(null), 2400);
    return () => window.clearTimeout(id);
  }, [vocabToast]);

  const handleParagraphPointerDown = useCallback(
    (e: React.PointerEvent<HTMLParagraphElement>) => {
      pointerStartRef.current = { x: e.clientX, y: e.clientY };
    },
    [],
  );

  const handleParagraphPointerUp = useCallback(
    (paragraphIndex: number, e: React.PointerEvent<HTMLParagraphElement>) => {
      const start = pointerStartRef.current;
      pointerStartRef.current = null;
      if (!start) return;
      const dx = e.clientX - start.x;
      const dy = e.clientY - start.y;
      if (Math.hypot(dx, dy) > TAP_MOVE_THRESHOLD_PX) return;

      const paragraphText = paragraphs[paragraphIndex];
      if (!paragraphText) return;

      const next = getTapSelectionInParagraph(
        e.currentTarget,
        paragraphIndex,
        paragraphText,
        e.clientX,
        e.clientY,
        segmentLanguage,
      );
      if (!next) return;

      setSelection(next);
      closeSlidePanels();
    },
    [paragraphs, segmentLanguage, closeSlidePanels],
  );

  const handleNudgeSelectionLeft = useCallback(() => {
    if (!selection) return;
    const paragraphText = paragraphs[selection.paragraphIndex];
    if (!paragraphText) return;
    const nudged = nudgeSelectionShrinkFromRight(
      paragraphText,
      selection.start,
      selection.end,
    );
    if (!nudged) {
      clearSelection();
      return;
    }
    setSelection(withParagraphIndex(nudged, selection.paragraphIndex));
  }, [selection, paragraphs, clearSelection]);

  const handleNudgeSelectionRight = useCallback(() => {
    if (!selection) return;
    const paragraphText = paragraphs[selection.paragraphIndex];
    if (!paragraphText) return;
    const nudged = nudgeSelectionExpandRight(
      paragraphText,
      selection.start,
      selection.end,
    );
    if (!nudged) return;
    setSelection(withParagraphIndex(nudged, selection.paragraphIndex));
  }, [selection, paragraphs]);

  const handleSaveVocab = useCallback(() => {
    if (!selection || !isReaderVocabSelectionWithinLimit(selection.text)) return;
    const text = selection.text;
    setSavedVocab((prev) => {
      if (prev.includes(text)) {
        queueMicrotask(() => {
          setVocabToast("duplicate");
          clearSelection();
        });
        return prev;
      }
      if (prev.length >= 15) return prev;
      queueMicrotask(() => {
        setVocabToast("saved");
        clearSelection();
      });
      return [...prev, text];
    });
  }, [selection, clearSelection]);

  const handleRemoveVocab = useCallback((word: string) => {
    setSavedVocab((prev) => prev.filter((w) => w !== word));
  }, []);

  const selectedText = selection?.text ?? "";
  const grammarSelectionWithinLimit = Boolean(
    selectedText && isReaderGrammarSelectionWithinLimit(selectedText),
  );
  const vocabSelectionWithinLimit = Boolean(
    selectedText && isReaderVocabSelectionWithinLimit(selectedText),
  );
  const translateSelectionWithinLimit = grammarSelectionWithinLimit;
  const canGrammar =
    Boolean(targetLanguage.trim() && nativeLanguage.trim()) &&
    Boolean(selectedText) &&
    grammarSelectionWithinLimit;
  const canTranslate =
    Boolean(nativeLanguage.trim()) &&
    Boolean(selectedText) &&
    translateSelectionWithinLimit;
  const grammarDisabledTitle = !grammarSelectionWithinLimit
    ? `Selection too long for Grammar (max ${MAX_READER_GRAMMAR_SELECTION_GRAPHEMES} characters)—shorten with the arrows`
    : !targetLanguage.trim() || !nativeLanguage.trim()
      ? "Add target and native language in Settings"
      : undefined;
  const translateDisabledTitle = !translateSelectionWithinLimit
    ? `Selection too long for Translate (max ${MAX_READER_GRAMMAR_SELECTION_GRAPHEMES} characters)—shorten with the arrows`
    : !nativeLanguage.trim()
      ? "Add native language in Settings"
      : undefined;
  const selectionAlreadyInVocab = Boolean(
    selectedText && savedVocab.includes(selectedText),
  );
  const canSaveToVocab =
    vocabSelectionWithinLimit &&
    (savedVocab.length < 15 || selectionAlreadyInVocab);
  const slidePanelOpen = grammarOpen || translateOpen;

  const handleGrammar = useCallback(async () => {
    if (
      !selection?.text.trim() ||
      !isReaderGrammarSelectionWithinLimit(selection.text)
    )
      return;
    const highlight = selection.text;
    setTranslateOpen(false);
    setTranslateError(null);
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
  }, [story.body, selection]);

  const handleTranslate = useCallback(async () => {
    if (
      !selection?.text.trim() ||
      !isReaderGrammarSelectionWithinLimit(selection.text)
    )
      return;
    const highlight = selection.text;
    setGrammarOpen(false);
    setGrammarError(null);
    setTranslateHighlight(highlight);
    setTranslateOpen(true);
    setTranslateLoading(true);
    setTranslateError(null);
    setTranslateText("");
    try {
      const res = await fetch("/api/translate-selection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: highlight,
          sourceLanguage: story.language,
        }),
      });
      const data = (await res.json()) as {
        translation?: unknown;
        error?: string;
      };
      if (!res.ok) {
        setTranslateError(data.error ?? "Translation failed");
        return;
      }
      const raw =
        typeof data.translation === "string" ? data.translation.trim() : "";
      if (raw) {
        setTranslateText(raw);
      } else {
        setTranslateError("No translation returned");
      }
    } catch {
      setTranslateError("Could not reach translation service");
    } finally {
      setTranslateLoading(false);
    }
  }, [selection, story.language]);

  return (
    <>
      <div
        ref={containerRef}
        role="article"
        className={`mt-8 select-none space-y-6 text-[var(--prose-text)] [-webkit-touch-callout:none] ${FONT_CLASSES[fontSize]}`}
        onContextMenu={(e) => e.preventDefault()}
      >
        {paragraphs.map((paragraph, i) => (
          <p
            key={i}
            data-paragraph-index={i}
            className="cursor-text"
            onPointerDown={handleParagraphPointerDown}
            onPointerUp={(e) => handleParagraphPointerUp(i, e)}
          >
            {renderParagraphText(paragraph, selection, i)}
          </p>
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
                Tap words to save them here.
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
              {slidePanelOpen && selection && (
                <motion.div
                  key="reader-slide-backdrop"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-[54] bg-black/25"
                  aria-hidden
                >
                  <button
                    type="button"
                    className="absolute inset-0"
                    aria-label="Close panel"
                    onClick={closeSlidePanels}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {selection && (
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
                          transition={{
                            type: "spring",
                            stiffness: 420,
                            damping: 36,
                          }}
                          className="overflow-hidden border-b border-[var(--border-default)]"
                        >
                          <ReaderSlidePanelContent
                            title="Grammar"
                            highlight={grammarHighlight}
                            onClose={closeGrammarPanel}
                            loading={grammarLoading}
                            loadingLabel="Getting a grammar note…"
                            error={grammarError}
                            body={grammarText}
                          />
                        </motion.div>
                      )}
                      {translateOpen && (
                        <motion.div
                          key="reader-translate-panel"
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{
                            type: "spring",
                            stiffness: 420,
                            damping: 36,
                          }}
                          className="overflow-hidden border-b border-[var(--border-default)]"
                        >
                          <ReaderSlidePanelContent
                            title="Translate"
                            highlight={translateHighlight}
                            onClose={closeTranslatePanel}
                            loading={translateLoading}
                            loadingLabel="Translating…"
                            error={translateError}
                            body={translateText}
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="flex justify-center p-2">
                      <div className="relative flex min-w-0 flex-wrap items-center justify-center gap-2">
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
                        <div className={`${TOOLBAR_CLUSTER} flex flex-wrap items-center justify-center`}>
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
                            className={TOOLBAR_ACTION_BTN}
                            aria-label="Save to vocab list"
                          >
                            Save
                          </button>
                          <div className="w-1 shrink-0 self-stretch" aria-hidden />
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
                            className={`${TOOLBAR_ICON_BTN} ${
                              grammarOpen
                                ? "border-[var(--nav-active-bg)] bg-[var(--nav-active-bg)] text-[var(--nav-active-fg)]"
                                : ""
                            }`}
                            aria-label="Grammar"
                            aria-pressed={grammarOpen}
                          >
                            <Lightbulb className="h-5 w-5" strokeWidth={2} aria-hidden />
                          </button>
                          <div className="w-1 shrink-0 self-stretch" aria-hidden />
                          <button
                            type="button"
                            disabled={!canTranslate}
                            title={translateDisabledTitle ?? "Translate selection"}
                            onPointerDown={(e) => e.preventDefault()}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (translateOpen) {
                                closeTranslatePanel();
                                return;
                              }
                              void handleTranslate();
                            }}
                            className={`${TOOLBAR_ICON_BTN} ${
                              translateOpen
                                ? "border-[var(--nav-active-bg)] bg-[var(--nav-active-bg)] text-[var(--nav-active-fg)]"
                                : ""
                            }`}
                            aria-label="Translate"
                            aria-pressed={translateOpen}
                          >
                            <Languages className="h-5 w-5" strokeWidth={2} aria-hidden />
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
                  className="pointer-events-none fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom,0px))] left-1/2 z-[60] flex max-w-[min(90vw,20rem)] -translate-x-1/2 items-center gap-2 rounded-2xl border border-[var(--semantic-success-border)] bg-[var(--semantic-success-bg)] px-4 py-3 text-sm font-medium text-[var(--semantic-success-text)] shadow-lg shadow-black/10"
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
