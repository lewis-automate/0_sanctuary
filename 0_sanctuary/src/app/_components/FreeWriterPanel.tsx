"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Maximize2, Minimize2 } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { queueWriteNowSubmission } from "@/app/writing/actions";

const MAX_CHARS = 500;

/** Same easing as Create “More options” panel. */
const PANEL_EASE = [0.83, 0, 0.17, 1] as const;
/** Create “More options” panel is 0.78s; this is 1.3× for the writer full-screen toggle. */
const PANEL_DURATION = 0.78 * 1.3;

const btnSecondary =
  "rounded-2xl border border-[var(--border-default)] bg-[var(--field-bg)] px-4 py-2.5 text-sm font-medium text-[var(--field-text)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-elevated)]";

const btnPrimary =
  "rounded-2xl border border-[var(--border-strong)] bg-[var(--nav-active-bg)] px-4 py-2.5 text-sm font-medium text-[var(--nav-active-fg)] transition-colors hover:opacity-90";

const textareaBase =
  "w-full rounded-2xl border border-[var(--field-border)] bg-[var(--field-bg)] px-4 pt-3 pb-9 text-sm leading-relaxed text-[var(--field-text)] shadow-sm placeholder:text-[var(--field-placeholder)] focus:border-[var(--border-strong)] focus:outline-none focus:ring-2 focus:ring-[var(--foreground)]/10";

const textareaClass = `${textareaBase} min-h-[14rem] resize-y`;

const textareaFullscreenClass = `${textareaBase} min-h-0 flex-1 resize-none`;

/** Free-form writing mockup (textarea + send confirmation). */
export function FreeWriterPanel() {
  const shouldReduceMotion = useReducedMotion();
  const titleId = useId();
  const fieldId = useId();
  const fieldFullscreenId = useId();
  const inlineCounterId = useId();
  const fullscreenCounterId = useId();
  const [text, setText] = useState("");
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [sendBusy, setSendBusy] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [submitConfirmed, setSubmitConfirmed] = useState(false);

  const panelTransition = shouldReduceMotion
    ? { duration: 0.18 * 1.3, ease: "easeOut" as const }
    : { duration: PANEL_DURATION, ease: PANEL_EASE };

  useEffect(() => {
    if (!submitConfirmed) return;
    const id = window.setTimeout(() => setSubmitConfirmed(false), 4500);
    return () => window.clearTimeout(id);
  }, [submitConfirmed]);

  const trimmed = text.trim();
  const summary =
    trimmed.length === 0
      ? "You haven’t written anything yet."
      : trimmed.length <= 120
        ? `“${trimmed}”`
        : `“${trimmed.slice(0, 117)}…” (${trimmed.length} characters)`;

  async function confirmSend() {
    setSendError(null);
    if (!trimmed) {
      setSendDialogOpen(false);
      return;
    }
    setSendBusy(true);
    try {
      const result = await queueWriteNowSubmission({
        text: trimmed,
        character_count: trimmed.length,
        submitted_from_fullscreen: fullscreen,
      });
      if (!result.ok) {
        setSendError(result.error);
        return;
      }
      setText("");
      setSendDialogOpen(false);
      if (fullscreen) setFullscreen(false);
      setSubmitConfirmed(true);
    } finally {
      setSendBusy(false);
    }
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
            className="rounded-3xl border border-[var(--border-default)] bg-[var(--surface-panel)] p-5 sm:p-6"
          >
            {submitConfirmed ? (
              <div
                className="mb-4 rounded-2xl border border-[var(--semantic-success-border)] bg-[var(--semantic-success-bg)] px-4 py-3 text-sm leading-relaxed text-[var(--semantic-success-text)]"
                role="status"
                aria-live="polite"
              >
                Sent. Your writing was submitted and will appear under current
                activities.
              </div>
            ) : null}
            <div className="mb-3 flex justify-center">
              <motion.button
                type="button"
                onClick={() => setFullscreen(true)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[var(--border-default)] bg-[var(--field-bg)] text-[var(--field-text)] shadow-sm transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-elevated)]"
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
            <div className="relative">
              <textarea
                id={fieldId}
                value={text}
                onChange={(e) => setText(e.target.value.slice(0, MAX_CHARS))}
                placeholder="Write here…"
                maxLength={MAX_CHARS}
                className={textareaClass}
                autoComplete="off"
                aria-describedby={inlineCounterId}
              />
              <span
                id={inlineCounterId}
                className="pointer-events-none absolute bottom-2 right-3 text-xs tabular-nums text-[var(--field-placeholder)]"
                aria-live="polite"
              >
                {text.length} / {MAX_CHARS}
              </span>
            </div>

            <div className="mt-5">
              <button
                type="button"
                onClick={() => {
                  setSendError(null);
                  setSendDialogOpen(true);
                }}
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
                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[var(--border-default)] bg-[var(--field-bg)] text-[var(--field-text)] shadow-sm transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-elevated)]"
                aria-label="Exit full screen"
                initial={false}
                whileTap={{ scale: shouldReduceMotion ? 1 : 0.97 }}
              >
                <Minimize2 className="h-4 w-4 shrink-0" aria-hidden />
              </motion.button>
            </div>
            <label htmlFor={fieldFullscreenId} className="sr-only">
              Your writing
            </label>
            <div className="relative flex min-h-0 flex-1 flex-col">
              <textarea
                id={fieldFullscreenId}
                value={text}
                onChange={(e) => setText(e.target.value.slice(0, MAX_CHARS))}
                placeholder="Write here…"
                maxLength={MAX_CHARS}
                className={textareaFullscreenClass}
                autoComplete="off"
                autoFocus
                aria-describedby={fullscreenCounterId}
              />
              <span
                id={fullscreenCounterId}
                className="pointer-events-none absolute bottom-2 right-3 text-xs tabular-nums text-[var(--field-placeholder)]"
                aria-live="polite"
              >
                {text.length} / {MAX_CHARS}
              </span>
            </div>
            <div className="flex shrink-0 flex-col items-center gap-1 pt-4">
              <button
                type="button"
                onClick={() => {
                  setSendError(null);
                  setSendDialogOpen(true);
                }}
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
            className="absolute inset-0 bg-black/45 disabled:cursor-not-allowed"
            aria-label="Close dialog"
            disabled={sendBusy}
            onClick={() => !sendBusy && setSendDialogOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="relative z-10 w-full max-w-md rounded-3xl border border-[var(--border-default)] bg-[var(--surface-panel-solid)] p-6 shadow-lg"
          >
            <h2
              id={titleId}
              className="text-base font-semibold text-[var(--foreground)]"
            >
              Confirm submission?
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-[var(--text-muted)]">
              {summary}
            </p>
            {sendError ? (
              <p className="mt-3 text-sm text-[var(--semantic-danger-inline)]" role="alert">
                {sendError}
              </p>
            ) : null}
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                className={btnSecondary}
                disabled={sendBusy}
                onClick={() => {
                  setSendError(null);
                  setSendDialogOpen(false);
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className={btnPrimary}
                disabled={sendBusy || !trimmed}
                onClick={() => void confirmSend()}
              >
                {sendBusy ? "Sending…" : "Send"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
