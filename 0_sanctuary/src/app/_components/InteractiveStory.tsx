"use client";

import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Story } from "../_data/stories";
import { queueProgressUpdate } from "../reader/actions";

type FontSize = "sm" | "md" | "lg";

const FONT_CLASSES: Record<FontSize, string> = {
  sm: "text-base leading-7",
  md: "text-lg leading-8",
  lg: "text-xl leading-9",
};

type Props = {
  story: Story;
  fontSize?: FontSize;
};

type TooltipState = {
  x: number;
  y: number;
  text: string;
} | null;

export function InteractiveStory({ story, fontSize = "md" }: Props) {
  const router = useRouter();
  const [tooltip, setTooltip] = useState<TooltipState>(null);
  const [savedVocab, setSavedVocab] = useState<string[]>([]);
  const [thoughts, setThoughts] = useState("");
  const [difficulty, setDifficulty] = useState<number | null>(null);
  const [engagement, setEngagement] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

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
      router.push("/library");
      router.refresh();
    } else {
      setSaving(false);
      setSaveError(result.error ?? "Failed to save progress");
    }
  }, [story.id, savedVocab, thoughts, difficulty, engagement, router]);

  useEffect(() => {
    if (!tooltip) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (tooltipRef.current?.contains(e.target as Node)) return;
      setTooltip(null);
      window.getSelection()?.removeAllRanges();
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [tooltip]);

  const handleMouseUp = useCallback(() => {
    const selection = window.getSelection();
    if (!selection) return;
    const text = selection.toString().trim();

    const anchor = selection.anchorNode;
    if (!text || !containerRef.current || !anchor || !containerRef.current.contains(anchor)) {
      setTooltip(null);
      return;
    }

    const range = selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
    const rect = range?.getBoundingClientRect();
    if (!rect) return;

    setTooltip({
      x: rect.left + rect.width / 2,
      y: rect.top,
      text,
    });
  }, []);

  const handleSaveVocab = useCallback(() => {
    if (tooltip) {
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

  return (
    <>
      <div
        ref={containerRef}
        role="article"
        className={`mt-8 select-text space-y-6 text-slate-700 ${FONT_CLASSES[fontSize]}`}
        onMouseUp={handleMouseUp}
      >
        {story.body.split("\n\n").map((paragraph, i) => (
          <p key={i}>{paragraph}</p>
        ))}
      </div>

      <AnimatePresence>
        {tooltip && (
          <motion.div
            ref={tooltipRef}
            className="fixed z-50 flex -translate-x-1/2 -translate-y-full gap-2 rounded-full bg-slate-900 px-2 py-1.5 shadow-lg"
            style={{
              left: tooltip.x,
              top: tooltip.y - 8,
            }}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{
              opacity: 0,
              scale: 1.15,
              transition: { duration: 0.2, ease: "easeOut" },
            }}
          >
            <button
              type="button"
              onClick={handleSaveVocab}
              disabled={savedVocab.length >= 15}
              className="rounded-full px-3 py-1 text-xs font-medium text-[#FDFCFB] transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Save vocab
            </button>
            <button
              type="button"
              disabled
              className="cursor-not-allowed rounded-full px-3 py-1 text-xs font-medium text-slate-500"
            >
              Translate
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <section className="mt-10 space-y-4 border-t border-slate-200 pt-6">
        <div>
          <label className="block text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
            Saved Vocab
          </label>
          <div className="mt-2 flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white/60 p-4">
            {savedVocab.length === 0 ? (
              <span className="text-sm text-slate-400">
                Saved words will appear here
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
              placeholder="Share anything that comes to mind"
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
    </>
  );
}

