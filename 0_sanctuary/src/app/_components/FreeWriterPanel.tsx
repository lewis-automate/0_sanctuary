"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Maximize2, Minimize2 } from "lucide-react";
import { useEffect, useId, useState } from "react";

const MAX_CHARS = 500;

/** Same easing as Create “More options” panel. */
const PANEL_EASE = [0.83, 0, 0.17, 1] as const;
/** Create “More options” panel is 0.78s; this is 1.3× for the writer full-screen toggle. */
const PANEL_DURATION = 0.78 * 1.3;

const btnSecondary =
  "rounded-2xl border border-slate-200 bg-white/80 px-4 py-2.5 text-sm font-medium text-slate-800 transition-colors hover:bg-white";

const btnPrimary =
  "rounded-2xl border border-slate-950 bg-slate-950 px-4 py-2.5 text-sm font-medium text-[#FDFCFB] transition-colors hover:bg-slate-800";

const textareaBase =
  "w-full rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-sm leading-relaxed text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-950/10";

const textareaClass = `${textareaBase} min-h-[14rem] resize-y`;

const textareaFullscreenClass = `${textareaBase} min-h-0 flex-1 resize-none`;

/** Free-form writing mockup (textarea + send confirmation). */
export function FreeWriterPanel() {
  const shouldReduceMotion = useReducedMotion();
  const titleId = useId();
  const fieldId = useId();
  const fieldFullscreenId = useId();
  const [text, setText] = useState("");
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  const panelTransition = shouldReduceMotion
    ? { duration: 0.18 * 1.3, ease: "easeOut" as const }
    : { duration: PANEL_DURATION, ease: PANEL_EASE };

  const trimmed = text.trim();
  const summary =
    trimmed.length === 0
      ? "You haven’t written anything yet."
      : trimmed.length <= 120
        ? `“${trimmed}”`
        : `“${trimmed.slice(0, 117)}…” (${trimmed.length} characters)`;

  function confirmSendMock() {
    setSendDialogOpen(false);
  }

  useEffect(() => {
    if (!fullscreen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      if (sendDialogOpen) {
        setSendDialogOpen(false);
        return;
      }
      setFullscreen(false);
    }
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [fullscreen, sendDialogOpen]);

  return (
    <>
      <AnimatePresence initial={false}>
        {!fullscreen && (
          <motion.section
            key="inline-writer"
            initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={
              shouldReduceMotion
                ? { opacity: 0 }
                : { opacity: 0, y: -8 }
            }
            transition={panelTransition}
            className="rounded-3xl border border-slate-200 bg-white/80 p-5 sm:p-6"
          >
            <div className="mb-3 flex justify-center">
              <motion.button
                type="button"
                onClick={() => setFullscreen(true)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white/80 text-slate-800 shadow-sm transition-colors hover:border-slate-300 hover:bg-white"
                aria-label="Fill screen with editor"
                initial={false}
                whileTap={{ scale: shouldReduceMotion ? 1 : 0.97 }}
              >
                <Maximize2 className="h-4 w-4 shrink-0" aria-hidden />
              </motion.button>
            </div>
            <label htmlFor={fieldId} className="sr-only">
              Your writing
            </label>
            <textarea
              id={fieldId}
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, MAX_CHARS))}
              placeholder="Write here…"
              maxLength={MAX_CHARS}
              className={textareaClass}
              autoComplete="off"
            />
            <p className="mt-2 text-right text-xs tabular-nums text-slate-500">
              {text.length} / {MAX_CHARS}
            </p>

            <div className="mt-5">
              <button
                type="button"
                onClick={() => setSendDialogOpen(true)}
                className={btnPrimary}
              >
                Send
              </button>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {fullscreen && (
          <motion.div
            key="fullscreen-writer"
            role="dialog"
            aria-modal="true"
            aria-label="Full screen writing"
            initial={
              shouldReduceMotion
                ? { opacity: 0 }
                : { opacity: 0, y: 12 }
            }
            animate={{ opacity: 1, y: 0 }}
            exit={
              shouldReduceMotion
                ? { opacity: 0 }
                : { opacity: 0, y: 12 }
            }
            transition={panelTransition}
            className="fixed inset-0 z-[100] flex flex-col bg-[var(--background)] px-4 pb-4 pt-[max(0.75rem,env(safe-area-inset-top))]"
          >
            <div className="flex shrink-0 flex-col items-center gap-2 pb-3">
              <motion.button
                type="button"
                onClick={() => setFullscreen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white/80 text-slate-800 shadow-sm transition-colors hover:border-slate-300 hover:bg-white"
                aria-label="Exit full screen"
                initial={false}
                whileTap={{ scale: shouldReduceMotion ? 1 : 0.97 }}
              >
                <Minimize2 className="h-4 w-4 shrink-0" aria-hidden />
              </motion.button>
              <p className="text-xs tabular-nums text-slate-500">
                {text.length} / {MAX_CHARS}
              </p>
            </div>
            <label htmlFor={fieldFullscreenId} className="sr-only">
              Your writing
            </label>
            <textarea
              id={fieldFullscreenId}
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, MAX_CHARS))}
              placeholder="Write here…"
              maxLength={MAX_CHARS}
              className={textareaFullscreenClass}
              autoComplete="off"
              autoFocus
            />
            <div className="flex shrink-0 flex-col items-center gap-1 pt-4">
              <p className="text-[11px] text-slate-400">Press Escape to exit</p>
              <button
                type="button"
                onClick={() => setSendDialogOpen(true)}
                className={btnPrimary}
              >
                Send
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {sendDialogOpen ? (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center p-4"
          role="presentation"
        >
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/40"
            aria-label="Close dialog"
            onClick={() => setSendDialogOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="relative z-10 w-full max-w-md rounded-3xl border border-slate-200 bg-[#FDFCFB] p-6 shadow-lg"
          >
            <h2 id={titleId} className="text-base font-semibold text-slate-900">
              Send this text?
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              Do you want to send what you&apos;ve written? {summary}
            </p>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                className={btnSecondary}
                onClick={() => setSendDialogOpen(false)}
              >
                Cancel
              </button>
              <button type="button" className={btnPrimary} onClick={confirmSendMock}>
                Send
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
