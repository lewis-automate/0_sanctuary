"use client";

import { FadeIn } from "../_components/FadeIn";
import { useEffect, useState } from "react";
import { queueStoryGeneration } from "./actions";

const DIFFICULTY_OPTIONS = ["A2", "A2/B1", "B1", "B1/B2", "B2", "B2/C1", "C1"] as const;

const COOLDOWN_SECONDS = 3;

export default function CreatePage() {
  const [topic, setTopic] = useState("");
  const [tone, setTone] = useState("");
  const [difficulty, setDifficulty] = useState<string | null>(null);
  const [wordCount, setWordCount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (countdown <= 0) return;
    const id = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(id);
          setSuccess(false);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [countdown]);

  const handleWordCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, "");
    if (digits === "") {
      setWordCount("");
      return;
    }
    const n = parseInt(digits, 10);
    setWordCount(n > 2500 ? "2500" : digits);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const result = await queueStoryGeneration({
      topic: topic || undefined,
      tone: tone || undefined,
      difficulty: difficulty || undefined,
      word_count: wordCount || undefined,
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
    <FadeIn className="mx-auto w-full max-w-prose">
      <header className="mb-6 text-center">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
          Create Reading Material
        </p>
      </header>

      <form className="space-y-6" onSubmit={handleSubmit}>
        <section>
          <label className="block text-sm font-medium text-slate-1000">
            Choose a topic
          </label>
          <p className="mt-1 text-xs text-slate-500">
            This is where you give direction to the topic. The what.
          </p>
          <div className="relative mt-3">
            <textarea
              rows={3}
              maxLength={200}
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="w-full resize-none rounded-3xl border border-slate-200 bg-white/80 px-3 py-3 pb-8 text-sm leading-relaxed text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-0"
              placeholder="Example: Tell me about a unique peculiarity of <target language> culture..."
            />
            <span className="absolute bottom-3 right-3 text-xs text-slate-400">
              {topic.length}/200
            </span>
          </div>
        </section>

        <section>
          <label className="block text-sm font-medium text-slate-1000">
            Tone or personality for the writer
          </label>
          <p className="mt-1 text-xs text-slate-500">
          This is where you give tone and/ or personality for the writer. The how.
          </p>
          <div className="relative mt-3">
            <textarea
              rows={3}
              maxLength={200}
              value={tone}
              onChange={(e) => setTone(e.target.value)}
              className="w-full resize-none rounded-3xl border border-slate-200 bg-white/80 px-3 py-3 pb-8 text-sm leading-relaxed text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-0"
              placeholder="Example: The omniscient narrator. Kind, wise, and insightful. Write like it's the winner for a teen literature contest."
            />
            <span className="absolute bottom-3 right-3 text-xs text-slate-400">
              {tone.length}/200
            </span>
          </div>
        </section>

        <section>
          <label className="block text-sm font-medium text-slate-1000">
            Difficulty
          </label>
          <p className="mt-1 text-xs text-slate-500">
            Start slightly below your current level.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
            {DIFFICULTY_OPTIONS.map((label) => {
              const isSelected = difficulty === label;
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => setDifficulty((d) => (d === label ? null : label))}
                  className={`flex items-center justify-start gap-2 rounded-2xl border px-3 py-2 transition-colors ${
                    isSelected
                      ? "border-slate-900 bg-slate-900 text-[#FDFCFB]"
                      : "border-slate-200 bg-white/70 text-slate-700 hover:bg-white"
                  }`}
                >
                  <span
                    className={`inline-block h-3 w-3 rounded-full border ${
                      isSelected ? "border-[#FDFCFB] bg-[#FDFCFB]" : "border-slate-300"
                    }`}
                  />
                  <span>{label}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section>
          <label className="block text-sm font-medium text-slate-1000">
            Target word-count
          </label>
          <p className="mt-1 text-xs text-slate-500">
            400-800 at the right level makes for a 5-10 minute read.
          </p>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={wordCount}
            onChange={handleWordCountChange}
            className="mt-3 w-full rounded-2xl border border-slate-200 bg-white/80 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-0"
            placeholder="e.g. 400 (max 2500)"
          />
        </section>

        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}
        <div className="pt-2">
          <button
            type="submit"
            disabled={submitting || countdown > 0}
            className="flex w-full items-center justify-center rounded-3xl bg-slate-900 px-4 py-3 text-sm font-semibold text-[#FDFCFB] shadow-sm transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting
              ? "Queuing…"
              : countdown > 0
                ? `Submit again in ${countdown}s`
                : "Write story"}
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
          <div className="w-full max-w-sm rounded-3xl border border-slate-200 bg-[#FDFCFB] p-6 shadow-lg">
            <h2 id="success-dialog-title" className="font-serif text-lg font-semibold text-slate-900">
              Story queued
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Check your library for progress. You can submit again in{" "}
              <span className="font-medium tabular-nums">{countdown}</span>s.
            </p>
          </div>
        </div>
      )}
    </FadeIn>
  );
}

