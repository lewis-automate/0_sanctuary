"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";

type SentenceItem = { sentence: string; reference: string };

type SessionPayload = {
  studyItemId: string;
  vocab: string;
  explanation: string;
  dissected: string;
  sentences: SentenceItem[];
};

type Props = {
  onBack: () => void;
  /** Called when the learner finishes the last step (Finish). */
  onComplete: () => void;
};

const btnNav =
  "rounded-2xl border px-4 py-2.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-45";
const btnBack = `${btnNav} border-slate-200 bg-white text-slate-800 hover:bg-slate-50`;
const btnNext = `${btnNav} border-slate-950 bg-slate-950 text-[#FDFCFB] hover:bg-slate-800`;

const topBackBtnClass =
  "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-[#fbf5ef]/90 text-slate-700 shadow-sm backdrop-blur transition-colors hover:border-slate-300 hover:bg-[#f5ece3]/95 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950/20";

const btnSecondary =
  "rounded-2xl border border-slate-200 bg-white/80 px-4 py-2.5 text-sm font-medium text-slate-800 transition-colors hover:bg-white";
const btnPrimary =
  "rounded-2xl border border-slate-950 bg-slate-950 px-4 py-2.5 text-sm font-medium text-[#FDFCFB] transition-colors hover:bg-slate-800";

export function FiveSentencesSession({ onBack, onComplete }: Props) {
  const [data, setData] = useState<SessionPayload | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [languagesRequired, setLanguagesRequired] = useState(false);
  /** 0 = explanation page; 1–5 = example sentences (pages 2–6). */
  const [stepIndex, setStepIndex] = useState(0);
  const [exitDialogOpen, setExitDialogOpen] = useState(false);
  const exitDialogTitleId = useId();
  const historyGuardPlacedRef = useRef(false);

  useEffect(() => {
    if (!historyGuardPlacedRef.current) {
      historyGuardPlacedRef.current = true;
      window.history.pushState(
        { hyperFocusGuard: true },
        "",
        window.location.href,
      );
    }

    function onPopState() {
      setExitDialogOpen(true);
      window.history.pushState(
        { hyperFocusGuard: true },
        "",
        window.location.href,
      );
    }

    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("popstate", onPopState);
      historyGuardPlacedRef.current = false;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadError(null);
      setLanguagesRequired(false);
      try {
        const res = await fetch("/api/study-items/five-sentences", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
        const json = (await res.json().catch(() => ({}))) as {
          error?: string;
          code?: string;
          studyItemId?: string;
          vocab?: string;
          explanation?: string;
          dissected?: string;
          sentences?: SentenceItem[];
        };
        if (!res.ok) {
          if (json.code === "LANGUAGES_REQUIRED") {
            if (!cancelled) setLanguagesRequired(true);
          }
          throw new Error(
            typeof json.error === "string" && json.error.trim()
              ? json.error.trim()
              : `Request failed (${res.status})`,
          );
        }
        const sentences = json.sentences;
        if (
          !json.vocab ||
          !json.explanation ||
          !json.dissected ||
          !Array.isArray(sentences) ||
          sentences.length !== 5
        ) {
          throw new Error("Invalid response from server.");
        }
        if (!cancelled) {
          setData({
            studyItemId: String(json.studyItemId ?? ""),
            vocab: json.vocab,
            explanation: json.explanation,
            dissected: json.dissected,
            sentences,
          });
          setStepIndex(0);
        }
      } catch (e) {
        if (!cancelled) {
          setLoadError(e instanceof Error ? e.message : "Could not load lesson.");
          setData(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const goNext = useCallback(() => {
    if (!data) return;
    if (stepIndex < 5) {
      setStepIndex((i) => i + 1);
    } else {
      onComplete();
    }
  }, [data, onComplete, stepIndex]);

  const goPrev = useCallback(() => {
    setStepIndex((i) => Math.max(0, i - 1));
  }, []);

  const requestExit = useCallback(() => {
    setExitDialogOpen(true);
  }, []);

  const leaveSession = useCallback(() => {
    setExitDialogOpen(false);
    onBack();
  }, [onBack]);

  const lessonStarted = data !== null;

  const exitDialog = exitDialogOpen ? (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4"
      role="presentation"
    >
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/40"
        aria-label="Close dialog"
        onClick={() => setExitDialogOpen(false)}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={exitDialogTitleId}
        className="relative z-10 w-full max-w-md rounded-3xl border border-slate-200 bg-[#FDFCFB] p-6 shadow-lg"
      >
        <h2
          id={exitDialogTitleId}
          className="text-base font-semibold text-slate-900"
        >
          Leave this lesson?
        </h2>
        {lessonStarted ? (
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            If you leave now, you&apos;ll exit before finishing all five
            examples. You can run Hyper focus again anytime from Practice.
          </p>
        ) : (
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            If you leave now, you&apos;ll exit Hyper focus. You can start again
            anytime from Practice.
          </p>
        )}
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            className={btnSecondary}
            onClick={() => setExitDialogOpen(false)}
          >
            Stay
          </button>
          <button type="button" className={btnPrimary} onClick={leaveSession}>
            Leave
          </button>
        </div>
      </div>
    </div>
  ) : null;

  const topBack = (
    <div className="flex shrink-0 items-center justify-start pt-1">
      <button
        type="button"
        onClick={requestExit}
        className={topBackBtnClass}
        aria-label="Back"
      >
        <ArrowLeft className="h-5 w-5 shrink-0" aria-hidden />
      </button>
    </div>
  );

  if (languagesRequired) {
    return (
      <div className="flex min-h-[min(90dvh,40rem)] flex-col gap-4 text-sm text-slate-800">
        {exitDialog}
        {topBack}
        <div
          className="rounded-3xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-sm text-amber-950"
          role="status"
        >
          Set your target and native language in{" "}
          <Link href="/settings" className="font-medium underline underline-offset-2">
            Settings
          </Link>{" "}
          to use Hyper focus practice.
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex min-h-[min(90dvh,40rem)] flex-col gap-4 text-sm text-slate-800">
        {exitDialog}
        {topBack}
        <p className="text-sm text-red-600">{loadError}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-[min(90dvh,40rem)] flex-col gap-4 text-sm text-slate-800">
        {exitDialog}
        {topBack}
        <p className="text-slate-500" aria-live="polite">
          Preparing explanation and examples…
        </p>
      </div>
    );
  }

  const onExplanationPage = stepIndex === 0;
  const sentenceSlot = stepIndex - 1;
  const current = !onExplanationPage ? data.sentences[sentenceSlot] : null;
  const exampleOrdinal = stepIndex; // 1–5 on sentence pages

  const bottomNav = (
    <div className="sticky bottom-0 z-20 -mx-1 mt-auto shrink-0 border-t border-slate-200/90 bg-[#FDFCFB]/95 px-1 pt-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur sm:-mx-0 sm:px-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={goPrev}
          disabled={stepIndex === 0}
          className={btnBack}
        >
          Previous
        </button>
        <button type="button" onClick={goNext} className={btnNext}>
          {stepIndex === 5 ? "Finish" : "Next"}
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-[min(90dvh,40rem)] flex-col text-sm text-slate-800">
      {exitDialog}
      <div className="sticky top-0 z-20 -mx-1 mb-2 shrink-0 bg-[#FDFCFB]/95 pb-1 pt-1 backdrop-blur sm:-mx-0">
        {topBack}
      </div>
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto pb-4">
          <div>
            <p className="text-center text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
              Collocation
            </p>
            <p className="mt-1 text-center text-xl font-semibold text-slate-900 sm:text-2xl">
              {data.vocab}
            </p>
          </div>

          {onExplanationPage ? (
            <div className="space-y-3 rounded-2xl border border-slate-200 bg-white/70 p-4">
              <div>
                <p className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-slate-400">
                  Explanation
                </p>
                <p className="mt-1.5 leading-relaxed text-slate-700">{data.explanation}</p>
              </div>
              <div className="border-t border-slate-100 pt-3">
                <p className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-slate-400">
                  Dissected
                </p>
                <p className="mt-1.5 whitespace-pre-wrap leading-relaxed text-slate-700">
                  {data.dissected}
                </p>
              </div>
            </div>
          ) : current ? (
            <div className="rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-sm">
              <p className="text-center text-xs font-medium tabular-nums text-slate-500">
                Example {exampleOrdinal} / 5
              </p>
              <p className="mt-4 text-center text-lg font-medium leading-snug text-slate-900 sm:text-xl">
                {current.sentence}
              </p>
              {current.reference.trim() ? (
                <p className="mt-4 text-center text-sm leading-relaxed text-slate-600">
                  {current.reference}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
        {bottomNav}
      </div>
    </div>
  );
}
