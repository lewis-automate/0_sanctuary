"use client";

import { ArrowLeft } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { queueRapidReviewComplete } from "./study-queue-actions";

type QueueItem = {
  id: string;
  vocab: string;
  example_sentences: string | null;
  definition: string | null;
  translation: string | null;
};

type Rating = "hard" | "good" | "easy";

type Props = {
  onExit: () => void;
  onComplete: () => void;
};

const topBackBtnClass =
  "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-[#fbf5ef]/90 text-slate-700 shadow-sm backdrop-blur transition-colors hover:border-slate-300 hover:bg-[#f5ece3]/95 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950/20 disabled:opacity-50";

export function RapidReviewSession({ onExit, onComplete }: Props) {
  const [queue, setQueue] = useState<QueueItem[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [showDefinition, setShowDefinition] = useState(false);
  const [showTranslation, setShowTranslation] = useState(false);
  const [ratingBusy, setRatingBusy] = useState(false);
  const [ratingSaveError, setRatingSaveError] = useState<string | null>(null);
  const [exitDialogOpen, setExitDialogOpen] = useState(false);
  const [exitBusy, setExitBusy] = useState(false);
  const exitDialogTitleId = useId();
  const historyGuardPlacedRef = useRef(false);
  const sessionRatingsRef = useRef<
    {
      study_item_id: string;
      vocab: string;
      rating: Rating;
      mastery_score: number | null;
      times_used: number | null;
    }[]
  >([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadError(null);
      try {
        const res = await fetch("/api/study-items/rapid-review");
        if (!res.ok) {
          const j = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(j.error ?? "Could not load review queue");
        }
        const data = (await res.json()) as { items: QueueItem[] };
        if (!cancelled) {
          setQueue(data.items ?? []);
        }
      } catch (e) {
        if (!cancelled) {
          setLoadError(e instanceof Error ? e.message : "Unknown error");
          setQueue([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!historyGuardPlacedRef.current) {
      historyGuardPlacedRef.current = true;
      window.history.pushState(
        { rapidReviewGuard: true },
        "",
        window.location.href,
      );
    }

    function onPopState() {
      setExitDialogOpen(true);
      window.history.pushState(
        { rapidReviewGuard: true },
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
    if (queue !== null) {
      sessionRatingsRef.current = [];
    }
  }, [queue]);

  const current = queue && index < queue.length ? queue[index] : null;
  const total = queue?.length ?? 0;
  const ordinal = total > 0 ? index + 1 : 0;
  const sessionActive = queue !== null && total > 0;

  const ratingUnlocked = showDefinition || showTranslation;

  useEffect(() => {
    setShowDefinition(false);
    setShowTranslation(false);
  }, [index]);

  useEffect(() => {
    setRatingSaveError(null);
  }, [index]);

  const submitRating = useCallback(
    async (rating: Rating) => {
      if (!current || ratingBusy || !(showDefinition || showTranslation)) return;
      setRatingSaveError(null);
      setRatingBusy(true);
      try {
        const res = await fetch("/api/study-items/rapid-review/rate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: typeof current.id === "string" ? current.id : String(current.id),
            rating,
          }),
        });
        const j = (await res.json().catch(() => ({}))) as {
          error?: string;
          mastery_score_before_rating?: unknown;
          times_used_before_rating?: unknown;
        };
        if (!res.ok) {
          throw new Error(
            typeof j.error === "string" && j.error.trim()
              ? j.error.trim()
              : "Could not save rating",
          );
        }
        const m = j.mastery_score_before_rating;
        const t = j.times_used_before_rating;
        const mastery_score =
          typeof m === "number" && Number.isFinite(m)
            ? m
            : typeof m === "string" && Number.isFinite(parseFloat(m))
              ? parseFloat(m)
              : null;
        const times_used =
          typeof t === "number" && Number.isFinite(t)
            ? Math.max(0, Math.trunc(t))
            : typeof t === "string" && Number.isFinite(parseInt(t, 10))
              ? Math.max(0, parseInt(t, 10))
              : null;

        sessionRatingsRef.current = [
          ...sessionRatingsRef.current,
          {
            study_item_id:
              typeof current.id === "string" ? current.id : String(current.id),
            vocab: current.vocab,
            rating,
            mastery_score,
            times_used,
          },
        ];

        if (index + 1 >= total) {
          const report = await queueRapidReviewComplete({
            ratings: sessionRatingsRef.current,
            partial: false,
          });
          if (!report.ok) {
            console.error("[RapidReview] Session report queue failed:", report.error);
          }
          onComplete();
        } else {
          setIndex((i) => i + 1);
        }
      } catch (e) {
        setRatingSaveError(
          e instanceof Error ? e.message : "Could not save rating. Try again.",
        );
      } finally {
        setRatingBusy(false);
      }
    },
    [
      current,
      index,
      onComplete,
      ratingBusy,
      showDefinition,
      showTranslation,
      total,
      queueRapidReviewComplete,
    ],
  );

  const leaveSession = useCallback(async () => {
    setExitBusy(true);
    try {
      const ratings = sessionRatingsRef.current;
      if (ratings.length >= 1) {
        const report = await queueRapidReviewComplete({
          ratings,
          partial: true,
        });
        if (!report.ok) {
          console.error("[RapidReview] Early-exit report queue failed:", report.error);
        }
      }
    } finally {
      setExitBusy(false);
      setExitDialogOpen(false);
      onExit();
    }
  }, [onExit]);

  const requestExit = useCallback(() => {
    setExitDialogOpen(true);
  }, []);

  const chip =
    "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed bg-white";
  const chipHard =
    `border-red-200/80 text-red-800 hover:bg-red-50 disabled:border-slate-200/80 disabled:bg-slate-100 disabled:text-slate-400 disabled:opacity-70 disabled:hover:bg-slate-100`;
  const chipGood =
    "text-slate-800 border-slate-300 hover:bg-slate-50 disabled:border-slate-200/80 disabled:bg-slate-100 disabled:text-slate-400 disabled:opacity-70 disabled:hover:bg-slate-100";
  const chipEasy =
    "border-emerald-200/90 text-emerald-900 hover:bg-emerald-50 disabled:border-slate-200/80 disabled:bg-slate-100 disabled:text-slate-400 disabled:opacity-70 disabled:hover:bg-slate-100";

  const hintBtn =
    "flex-1 rounded-2xl border px-4 py-3.5 text-sm font-medium transition-colors";
  const hintBtnIdle = `${hintBtn} border-slate-200 bg-white text-slate-800 shadow-sm hover:border-slate-300 hover:bg-slate-50`;
  const hintBtnActive = `${hintBtn} border-slate-900 bg-slate-950 text-[#FDFCFB] shadow-sm`;

  const btnSecondary =
    "rounded-2xl border border-slate-200 bg-white/80 px-4 py-2.5 text-sm font-medium text-slate-800 transition-colors hover:bg-white";
  const btnPrimary =
    "rounded-2xl border border-slate-950 bg-slate-950 px-4 py-2.5 text-sm font-medium text-[#FDFCFB] transition-colors hover:bg-slate-800";

  const topBar = (
    <div className="sticky top-0 z-20 -mx-1 mb-4 flex items-center justify-between gap-3 bg-[#FDFCFB]/90 pb-2 pt-1 backdrop-blur sm:-mx-0">
      <button
        type="button"
        onClick={requestExit}
        disabled={ratingBusy || exitBusy}
        className={topBackBtnClass}
        aria-label="Back"
      >
        <ArrowLeft className="h-5 w-5 shrink-0" aria-hidden />
      </button>
      {sessionActive ? (
        <span
          className="inline-flex min-w-[3.25rem] items-center justify-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold tabular-nums text-slate-800 shadow-sm"
          aria-live="polite"
        >
          {ordinal}/{total}
        </span>
      ) : (
        <span className="h-10 w-10 shrink-0" aria-hidden />
      )}
    </div>
  );

  const exitDialog = exitDialogOpen ? (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4"
      role="presentation"
    >
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/40 disabled:cursor-not-allowed"
        aria-label="Close dialog"
        disabled={exitBusy}
        onClick={() => !exitBusy && setExitDialogOpen(false)}
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
          Leave rapid review?
        </h2>
        {sessionActive ? (
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            Given ratings are saved, but this session can&apos;t be resumed.
          </p>
        ) : (
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            If you leave now, you&apos;ll exit rapid review. You can start
            again anytime from Practice.
          </p>
        )}
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            className={btnSecondary}
            disabled={exitBusy}
            onClick={() => setExitDialogOpen(false)}
          >
            Stay
          </button>
          <button
            type="button"
            className={btnPrimary}
            disabled={exitBusy}
            onClick={() => void leaveSession()}
          >
            {exitBusy ? "Sending…" : "Leave"}
          </button>
        </div>
      </div>
    </div>
  ) : null;

  if (loadError) {
    return (
      <div className="relative mx-auto flex max-w-lg flex-1 flex-col pb-10">
        {exitDialog}
        {topBar}
        <p className="text-sm text-red-600">{loadError}</p>
      </div>
    );
  }

  if (queue === null) {
    return (
      <div className="relative mx-auto flex max-w-lg flex-1 flex-col pb-10">
        {exitDialog}
        {topBar}
        <p className="text-slate-500" aria-live="polite">
          Loading cards…
        </p>
      </div>
    );
  }

  if (total === 0) {
    return (
      <div className="relative mx-auto flex max-w-lg flex-1 flex-col pb-10">
        {exitDialog}
        {topBar}
        <p className="text-slate-500">
          No saved words yet. Add some under Add first.
        </p>
      </div>
    );
  }

  return (
    <div className="relative mx-auto flex h-[85dvh] max-h-[calc(100dvh-2rem)] w-full max-w-lg flex-col">
      {exitDialog}
      {topBar}

      <div className="flex min-h-0 flex-1 flex-col px-1 sm:px-0">
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain pb-3 [-webkit-overflow-scrolling:touch]">
          <p className="text-center text-2xl font-semibold leading-snug text-slate-900 sm:text-3xl">
            {current?.vocab}
          </p>
          {current?.example_sentences?.trim() ? (
            <p className="mt-4 text-center text-base leading-relaxed text-slate-600 sm:text-lg">
              {current.example_sentences}
            </p>
          ) : (
            <p className="mt-4 text-center text-sm italic text-slate-400">
              No example sentence yet.
            </p>
          )}

          {(showDefinition || showTranslation) && (
            <div className="mt-8 space-y-4 text-left text-sm leading-relaxed text-slate-700">
              {showDefinition && (
                <div>
                  <p className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-slate-400">
                    Definition
                  </p>
                  <p className="mt-1.5 text-base text-slate-800">
                    {current?.definition?.trim()
                      ? current.definition
                      : "None saved yet."}
                  </p>
                </div>
              )}
              {showTranslation && (
                <div>
                  <p className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-slate-400">
                    Translation
                  </p>
                  <p className="mt-1.5 text-base text-slate-800">
                    {current?.translation?.trim()
                      ? current.translation
                      : "None saved yet."}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="shrink-0 space-y-3 border-t border-slate-200/90 bg-[#FDFCFB]/95 pt-3 backdrop-blur-sm pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          {ratingSaveError ? (
            <div
              role="alert"
              className="rounded-2xl border border-red-200 bg-red-50/95 px-3 py-2.5 text-sm text-red-950"
            >
              <p className="font-medium">Couldn&apos;t save</p>
              <p className="mt-1 leading-relaxed text-red-900/95">
                {ratingSaveError}
              </p>
              <p className="mt-2 text-xs text-red-800/90">
                Stay on this card and tap Hard, Good, or Easy again to retry.
              </p>
            </div>
          ) : null}

          <div className="flex gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setShowDefinition((v) => !v)}
              className={showDefinition ? hintBtnActive : hintBtnIdle}
              aria-pressed={showDefinition}
            >
              Definition
            </button>
            <button
              type="button"
              onClick={() => setShowTranslation((v) => !v)}
              className={showTranslation ? hintBtnActive : hintBtnIdle}
              aria-pressed={showTranslation}
            >
              Translation
            </button>
          </div>

          <div
            className="flex gap-2 sm:gap-3"
            role="group"
            aria-label="Rate how well you knew this word"
          >
            <button
              type="button"
              disabled={!ratingUnlocked || ratingBusy}
              onClick={() => void submitRating("hard")}
              className={`${chip} ${chipHard} flex-1`}
            >
              Hard
            </button>
            <button
              type="button"
              disabled={!ratingUnlocked || ratingBusy}
              onClick={() => void submitRating("good")}
              className={`${chip} ${chipGood} flex-1`}
            >
              Good
            </button>
            <button
              type="button"
              disabled={!ratingUnlocked || ratingBusy}
              onClick={() => void submitRating("easy")}
              className={`${chip} ${chipEasy} flex-1`}
            >
              Easy
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
