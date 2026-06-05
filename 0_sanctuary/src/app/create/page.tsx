"use client";

import Link from "next/link";
import { FadeIn } from "../_components/FadeIn";
import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import { DIFFICULTY_OPTIONS } from "@/lib/difficulty-options";
import { queueStoryGeneration } from "./actions";

/** Long enough for success swipe + fade; re-tune if SUCCESS_SWIPE_MS / SUCCESS_FADE_MS change. */
const COOLDOWN_SECONDS = 5;

/** Bell-shaped easing so expand and collapse feel identical (slow → fast → slow). */
const MORE_OPTIONS_PANEL_EASE = [0.83, 0, 0.17, 1] as const;
const MORE_OPTIONS_PANEL_MS = 0.78;

/** Slow-in / slow-out: gentle at both ends (bell-shaped easing, not “shoot from the bottom”). */
const SUCCESS_SWIPE_EASE = "cubic-bezier(0.83, 0, 0.17, 1)";
const SUCCESS_SWIPE_MS = 3400;
/** Fits in the last ~1s tick before countdown ends (see effect: fade starts at countdown === 1). */
const SUCCESS_FADE_MS = 900;

export default function CreatePage() {
  const shouldReduceMotion = useReducedMotion();
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState<string | null>(null);
  const [wordCount, setWordCount] = useState("");
  const [topicMemory, setTopicMemory] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [swipeStarted, setSwipeStarted] = useState(false);
  const [swipeDone, setSwipeDone] = useState(false);
  const [moreOptionsOpen, setMoreOptionsOpen] = useState(false);

  useEffect(() => {
    if (countdown <= 0) return;
    const id = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(id);
          // Clear all form inputs when countdown finishes
          setTopic("");
          setDifficulty(null);
          setWordCount("");
          setTopicMemory("");
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [countdown]);

  useEffect(() => {
    if (!success) {
      setSwipeStarted(false);
      setSwipeDone(false);
      return;
    }

    // Start swipe when countdown begins
    if (countdown === COOLDOWN_SECONDS) {
      setSwipeStarted(true);
    }

    // Start fade-out 1s before countdown ends and jump to top once screen is fully covered
    if (countdown === 1 && !swipeDone) {
      if (typeof window !== "undefined") {
        window.scrollTo({ top: 0, behavior: "auto" });
      }
      setSwipeDone(true);
    }

    // After countdown ends, hide overlay
    if (countdown === 0 && swipeDone) {
      setSuccess(false);
      setSwipeStarted(false);
      setSwipeDone(false);
    }
  }, [success, countdown, swipeDone]);

  const handleWordCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, "");
    if (digits === "") {
      setWordCount("");
      return;
    }
    const n = parseInt(digits, 10);
    setWordCount(n > 2500 ? "2500" : digits);
  };

  const handleTopicMemoryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, "").slice(0, 2);
    if (digits === "") {
      setTopicMemory("");
      return;
    }
    const n = parseInt(digits, 10);
    setTopicMemory(n > 99 ? "99" : digits);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const result = await queueStoryGeneration({
      topic: topic || undefined,
      difficulty: difficulty || undefined,
      word_count: wordCount || undefined,
      last_stories_filter: (() => {
        const t = topicMemory.trim();
        if (t === "") return undefined;
        const n = parseInt(t, 10);
        if (!Number.isFinite(n)) return undefined;
        return Math.min(99, Math.max(0, n));
      })(),
    });
    setSubmitting(false);
    if (result.ok) {
      setError(null);
      setSuccess(true);
      setCountdown(COOLDOWN_SECONDS);
    } else {
      setError(result.error);
    }
  };

  return (
    <FadeIn variant="tab" className="mx-auto w-full max-w-prose">
      <header className="mb-6 text-center">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--text-muted)]">
          Create Reading Material
        </p>
      </header>

      <p className="mb-6 text-center text-sm italic leading-relaxed text-[var(--text-muted)]">
        Empty fields will use your default settings.
      </p>

      <form className="space-y-6" onSubmit={handleSubmit}>
        <section>
          <label className="block text-sm font-medium text-[var(--foreground)]">
            Choose a topic
          </label>
          <div className="relative mt-3">
            <textarea
              rows={3}
              maxLength={200}
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="w-full resize-none rounded-3xl border border-[var(--field-border)] bg-[var(--field-bg)] px-3 py-3 pb-8 text-sm leading-relaxed text-[var(--field-text)] placeholder:text-[var(--field-placeholder)] focus:border-[var(--border-strong)] focus:outline-none focus:ring-0"
              placeholder="What do you want the writing to be about...?"
            />
            <span className="absolute bottom-3 right-3 text-xs text-[var(--field-placeholder)]">
              {topic.length}/200
            </span>
          </div>
        </section>

        <div className="border-t border-[var(--border-default)] pt-2">
          <button
            type="button"
            id="create-more-options-label"
            aria-expanded={moreOptionsOpen}
            aria-controls="create-more-options-panel"
            onClick={() => setMoreOptionsOpen((open) => !open)}
            className="flex w-full items-center justify-between gap-3 rounded-2xl border border-[var(--field-border)] bg-[var(--field-bg)] px-4 py-3 text-left text-sm font-medium text-[var(--foreground)] transition-colors duration-500 ease-[cubic-bezier(0.83,0,0.17,1)] hover:bg-[var(--surface-elevated)]"
          >
            <span>More options</span>
            <motion.span
              className="inline-block text-[var(--text-muted)]"
              aria-hidden
              initial={false}
              animate={{
                rotate: moreOptionsOpen ? 180 : 0,
              }}
              transition={
                shouldReduceMotion
                  ? { duration: 0.15 }
                  : {
                      duration: MORE_OPTIONS_PANEL_MS,
                      ease: MORE_OPTIONS_PANEL_EASE,
                    }
              }
            >
              ▾
            </motion.span>
          </button>

          <motion.div
            id="create-more-options-panel"
            role="region"
            aria-labelledby="create-more-options-label"
            aria-hidden={!moreOptionsOpen}
            initial={false}
            inert={!moreOptionsOpen ? true : undefined}
            animate={
              shouldReduceMotion
                ? {
                    maxHeight: moreOptionsOpen ? 2600 : 0,
                    opacity: moreOptionsOpen ? 1 : 0,
                    marginTop: moreOptionsOpen ? 16 : 0,
                  }
                : {
                    maxHeight: moreOptionsOpen ? 2600 : 0,
                    opacity: moreOptionsOpen ? 1 : 0,
                    marginTop: moreOptionsOpen ? 16 : 0,
                    y: moreOptionsOpen ? 0 : -10,
                  }
            }
            transition={
              shouldReduceMotion
                ? { duration: 0.18, ease: "easeOut" }
                : {
                    duration: MORE_OPTIONS_PANEL_MS,
                    ease: MORE_OPTIONS_PANEL_EASE,
                  }
            }
            className="space-y-6 overflow-hidden"
          >
        <section>
          <label className="block text-sm font-medium text-[var(--foreground)]">
            Current level
          </label>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Recommended: Start slightly below your current level.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
            {DIFFICULTY_OPTIONS.map((label) => {
              const isSelected = difficulty === label;
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => setDifficulty((d) => (d === label ? null : label))}
                  className={`flex items-center justify-start gap-2 rounded-2xl border px-3 py-2 transition-colors ${
                    isSelected
                      ? "border-[var(--nav-active-bg)] bg-[var(--nav-active-bg)] text-[var(--nav-active-fg)]"
                      : "border-[var(--field-border)] bg-[var(--field-bg)] text-[var(--field-text)] hover:border-[var(--border-strong)]"
                  }`}
                >
                  <span
                    className={`inline-block h-3 w-3 rounded-full border ${
                      isSelected
                        ? "border-[var(--nav-active-fg)] bg-[var(--nav-active-fg)]"
                        : "border-[var(--border-strong)]"
                    }`}
                  />
                  <span>{label}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section>
          <label className="block text-sm font-medium text-[var(--foreground)]">
            Target word-count
          </label>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            400-800 at the right level makes for a 5-10 minute read.
          </p>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={wordCount}
            onChange={handleWordCountChange}
            className="mt-3 w-full rounded-2xl border border-[var(--field-border)] bg-[var(--field-bg)] px-3 py-2 text-sm text-[var(--field-text)] placeholder:text-[var(--field-placeholder)] focus:border-[var(--border-strong)] focus:outline-none focus:ring-0"
            placeholder="e.g. 400 (max 2500)"
          />
        </section>

        <section>
          <label className="block text-sm font-medium text-[var(--foreground)]">
            Topic memory
          </label>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            This works only if topic already exists.
          </p>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={2}
            value={topicMemory}
            onChange={handleTopicMemoryChange}
            className="mt-3 w-full rounded-2xl border border-[var(--field-border)] bg-[var(--field-bg)] px-3 py-2 text-sm text-[var(--field-text)] placeholder:text-[var(--field-placeholder)] focus:border-[var(--border-strong)] focus:outline-none focus:ring-0"
            placeholder="0–99 (optional)"
          />
        </section>
          </motion.div>
        </div>

        {error && (
          <p className="text-sm text-[var(--semantic-danger-inline)]">{error}</p>
        )}
        <div className="pt-2">
          <button
            type="submit"
            disabled={submitting || countdown > 0}
            className="flex w-full items-center justify-center rounded-3xl bg-[var(--nav-active-bg)] px-4 py-3 text-sm font-semibold text-[var(--nav-active-fg)] shadow-sm transition-[color,background-color,opacity,transform] duration-[1.45s] ease-[cubic-bezier(0.83,0,0.17,1)] hover:opacity-90 active:scale-[0.985] motion-reduce:active:scale-100 disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100 motion-reduce:transition-colors motion-reduce:duration-200"
          >
            {submitting
              ? "Queuing…"
              : countdown > 0
                ? `Submit again in ${countdown}s`
                : "Write"}
          </button>
        </div>
      </form>

      {success && countdown > 0 && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="success-dialog-title"
        >
          <div className="w-full max-w-sm rounded-3xl border border-[var(--border-default)] bg-[var(--surface-panel-solid)] p-6 shadow-lg">
            <h2
              id="success-dialog-title"
              className="font-serif text-lg font-semibold text-[var(--foreground)]"
            >
              Story queued
            </h2>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              Check your library for progress. You can submit again in{" "}
              <span className="font-medium tabular-nums">{countdown}</span>s.
            </p>
            <Link
              href="/library"
              className="mt-4 inline-flex w-full items-center justify-center rounded-2xl border border-[var(--border-strong)] bg-[var(--nav-active-bg)] px-4 py-2.5 text-sm font-semibold text-[var(--nav-active-fg)] transition-opacity hover:opacity-90"
            >
              Go to Library
            </Link>
          </div>
        </div>
      )}

      {success && (
        <div className="fixed inset-0 z-40 overflow-hidden pointer-events-none">
          <div
            className="absolute inset-0 bg-slate-900 transform motion-reduce:transition-none"
            style={{
              transitionProperty: "transform, opacity",
              transitionDuration: shouldReduceMotion
                ? "220ms, 160ms"
                : `${SUCCESS_SWIPE_MS}ms, ${SUCCESS_FADE_MS}ms`,
              transitionTimingFunction: shouldReduceMotion
                ? "ease-out, ease-out"
                : `${SUCCESS_SWIPE_EASE}, ${SUCCESS_SWIPE_EASE}`,
              transform: swipeStarted ? "translateY(0%)" : "translateY(100%)",
              opacity: swipeDone ? 0 : 1,
            }}
          />
        </div>
      )}
    </FadeIn>
  );
}

