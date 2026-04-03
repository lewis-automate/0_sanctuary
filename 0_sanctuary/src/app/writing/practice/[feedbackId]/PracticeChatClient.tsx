"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { queueFeedbackReviewed } from "@/app/vocab/actions";
import {
  MAX_USER_PRACTICE_MESSAGES,
  MIN_USER_MESSAGES_FOR_PRACTICE_COMPLETE,
} from "@/lib/practice-user-message-limit";

type ChatMessage = { role: "user" | "assistant"; content: string };

type Props = {
  feedbackId: string;
  focusPoint: string | null;
};

const btnPrimary =
  "rounded-2xl border border-[var(--border-strong)] bg-[var(--nav-active-bg)] px-4 py-2.5 text-sm font-medium text-[var(--nav-active-fg)] transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50";

const btnSecondary =
  "rounded-2xl border border-[var(--border-default)] bg-[var(--field-bg)] px-4 py-2.5 text-sm font-medium text-[var(--field-text)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-elevated)]";

const bubbleUser =
  "rounded-3xl rounded-br-lg border border-[var(--field-border)] bg-[var(--field-bg)] px-4 py-3 text-sm leading-relaxed text-[var(--field-text)]";
const bubbleAssistant =
  "rounded-3xl rounded-bl-lg border border-[var(--border-default)] bg-[var(--surface-elevated)] px-4 py-3 text-sm leading-relaxed text-[var(--prose-text)]";

export function PracticeChatClient({ feedbackId, focusPoint }: Props) {
  const router = useRouter();
  const incompleteDialogTitleId = useId();
  const completeConfirmTitleId = useId();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [bootstrapDone, setBootstrapDone] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [languagesRequired, setLanguagesRequired] = useState(false);
  const [incompleteDialogOpen, setIncompleteDialogOpen] = useState(false);
  const [completeConfirmOpen, setCompleteConfirmOpen] = useState(false);
  const [markingDone, setMarkingDone] = useState(false);

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const markedPracticedRef = useRef(false);
  const userMessageCountRef = useRef(0);
  const historyGuardPlacedRef = useRef(false);

  const userMessageCount = useMemo(
    () => messages.filter((m) => m.role === "user").length,
    [messages],
  );
  userMessageCountRef.current = userMessageCount;

  const atUserMessageLimit = userMessageCount >= MAX_USER_PRACTICE_MESSAGES;
  const meetsCompleteThreshold =
    userMessageCount >= MIN_USER_MESSAGES_FOR_PRACTICE_COMPLETE;

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, sending, scrollToBottom]);

  const markPracticedIfNeeded = useCallback(async () => {
    if (markedPracticedRef.current) {
      return { ok: true } as const;
    }
    const result = await queueFeedbackReviewed({
      feedback_id: feedbackId,
      reviewed: true,
      focus_point: focusPoint,
    });
    if (result.ok) {
      markedPracticedRef.current = true;
    }
    return result;
  }, [feedbackId, focusPoint]);

  useEffect(() => {
    let cancelled = false;
    async function bootstrap() {
      setLoading(true);
      setError(null);
      setLanguagesRequired(false);
      try {
        const res = await fetch("/api/practice-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ feedbackId, messages: [] }),
        });
        const data = (await res.json().catch(() => ({}))) as {
          reply?: string;
          error?: string;
          code?: string;
        };
        if (!res.ok) {
          if (data.code === "LANGUAGES_REQUIRED") {
            if (!cancelled) setLanguagesRequired(true);
          }
          throw new Error(
            typeof data.error === "string" && data.error.trim()
              ? data.error.trim()
              : `Request failed (${res.status})`,
          );
        }
        const reply = typeof data.reply === "string" ? data.reply.trim() : "";
        if (!reply) {
          throw new Error("Empty reply from tutor.");
        }
        if (!cancelled) {
          setMessages([{ role: "assistant", content: reply }]);
          setBootstrapDone(true);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not start practice.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    bootstrap();
    return () => {
      cancelled = true;
    };
  }, [feedbackId]);

  useEffect(() => {
    if (!bootstrapDone || loading) return;

    if (!historyGuardPlacedRef.current) {
      historyGuardPlacedRef.current = true;
      window.history.pushState(
        { practiceGuard: true },
        "",
        window.location.href,
      );
    }

    function onPopState() {
      if (userMessageCountRef.current >= MIN_USER_MESSAGES_FOR_PRACTICE_COMPLETE) {
        void (async () => {
          await markPracticedIfNeeded();
          router.replace("/continue");
        })();
        return;
      }
      setIncompleteDialogOpen(true);
      window.history.pushState(
        { practiceGuard: true },
        "",
        window.location.href,
      );
    }

    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("popstate", onPopState);
      historyGuardPlacedRef.current = false;
    };
  }, [bootstrapDone, loading, markPracticedIfNeeded, router]);

  useEffect(() => {
    return () => {
      const n = userMessageCountRef.current;
      if (n >= MIN_USER_MESSAGES_FOR_PRACTICE_COMPLETE && !markedPracticedRef.current) {
        void queueFeedbackReviewed({
          feedback_id: feedbackId,
          reviewed: true,
          focus_point: focusPoint,
        }).then((r) => {
          if (r.ok) markedPracticedRef.current = true;
        });
      }
    };
  }, [feedbackId, focusPoint]);

  function openIncompleteOrLeave() {
    if (meetsCompleteThreshold) {
      void completeAndContinue();
    } else {
      setIncompleteDialogOpen(true);
    }
  }

  async function completeAndContinue() {
    setMarkingDone(true);
    setError(null);
    try {
      const result = await markPracticedIfNeeded();
      if (!result.ok) {
        throw new Error(result.error);
      }
      router.replace("/continue");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save progress.");
    } finally {
      setMarkingDone(false);
    }
  }

  function handleDonePress() {
    if (!bootstrapDone || loading || markingDone) return;
    if (meetsCompleteThreshold) {
      setCompleteConfirmOpen(true);
    } else {
      setIncompleteDialogOpen(true);
    }
  }

  function handleBackPress() {
    if (loading && !bootstrapDone) {
      router.replace("/writing");
      return;
    }
    if (!bootstrapDone || markingDone) {
      router.replace("/writing");
      return;
    }
    openIncompleteOrLeave();
  }

  async function sendUserMessage() {
    const text = draft.trim();
    if (
      !text ||
      sending ||
      !bootstrapDone ||
      userMessageCount >= MAX_USER_PRACTICE_MESSAGES
    ) {
      return;
    }

    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: text }];
    setDraft("");
    setSending(true);
    setError(null);

    try {
      const res = await fetch("/api/practice-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedbackId, messages: nextMessages }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        reply?: string;
        error?: string;
        code?: string;
      };
      if (!res.ok) {
        if (data.code === "LANGUAGES_REQUIRED") {
          setLanguagesRequired(true);
        }
        throw new Error(
          typeof data.error === "string" && data.error.trim()
            ? data.error.trim()
            : `Request failed (${res.status})`,
        );
      }
      const reply = typeof data.reply === "string" ? data.reply.trim() : "";
      if (!reply) {
        throw new Error("Empty reply from tutor.");
      }
      setMessages([...nextMessages, { role: "assistant", content: reply }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send message.");
      setDraft(text);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex min-h-[min(70vh,32rem)] flex-col gap-4">
      <div className="flex items-center justify-start gap-3 pt-1">
        <button
          type="button"
          onClick={() => void handleBackPress()}
          disabled={markingDone}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--border-default)] bg-[var(--chrome-fab-bg)] text-[var(--foreground)] shadow-sm backdrop-blur transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--chrome-fab-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--foreground)]/15 disabled:opacity-50"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5 shrink-0" aria-hidden />
        </button>
      </div>

      {incompleteDialogOpen ? (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center p-4"
          role="presentation"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/45"
            aria-label="Close dialog"
            onClick={() => setIncompleteDialogOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={incompleteDialogTitleId}
            className="relative z-10 w-full max-w-md rounded-3xl border border-[var(--border-default)] bg-[var(--surface-panel-solid)] p-6 shadow-lg"
          >
            <h2
              id={incompleteDialogTitleId}
              className="text-base font-semibold text-[var(--foreground)]"
            >
              Finish practice first?
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-[var(--text-muted)]">
              Leave at least 3 messages to count this lesson as complete.
            </p>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                className={btnSecondary}
                onClick={() => setIncompleteDialogOpen(false)}
              >
                Stay
              </button>
              <button
                type="button"
                className={btnPrimary}
                onClick={() => {
                  setIncompleteDialogOpen(false);
                  router.replace("/continue");
                }}
              >
                Leave anyway
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {completeConfirmOpen ? (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center p-4"
          role="presentation"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/45"
            aria-label="Close dialog"
            onClick={() => setCompleteConfirmOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={completeConfirmTitleId}
            className="relative z-10 w-full max-w-md rounded-3xl border border-[var(--border-default)] bg-[var(--surface-panel-solid)] p-6 shadow-lg"
          >
            <h2
              id={completeConfirmTitleId}
              className="text-base font-semibold text-[var(--foreground)]"
            >
              Complete this lesson?
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-[var(--text-muted)]">
              We&apos;ll mark this practice as done and take you to the next
              step so you can keep your momentum.
            </p>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                className={btnSecondary}
                onClick={() => setCompleteConfirmOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className={btnPrimary}
                onClick={() => {
                  setCompleteConfirmOpen(false);
                  void completeAndContinue();
                }}
              >
                Complete lesson
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {languagesRequired && (
        <div
          className="rounded-3xl border border-[var(--semantic-warning-border)] bg-[var(--semantic-warning-bg)] px-4 py-3 text-sm text-[var(--semantic-warning-text)]"
          role="status"
        >
          Set your target and native language in{" "}
          <Link href="/settings" className="font-medium underline underline-offset-2">
            Settings
          </Link>{" "}
          to use Practice.
        </div>
      )}
      {error && (
        <div
          className="rounded-3xl border border-[var(--semantic-danger-border)] bg-[var(--semantic-danger-bg)] px-4 py-3 text-sm text-[var(--semantic-danger-text)]"
          role="alert"
        >
          {error}
        </div>
      )}

      <div
        className="flex flex-1 flex-col gap-3 overflow-y-auto rounded-3xl border border-[var(--border-default)] bg-[var(--surface-panel)] p-4 sm:p-5"
        aria-live="polite"
      >
        {loading && messages.length === 0 && (
          <p className="text-center text-sm text-[var(--text-muted)]">
            Starting your tutor…
          </p>
        )}
        {messages.map((m, i) => (
          <div
            key={`${i}-${m.role}`}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[min(100%,36rem)] ${m.role === "user" ? bubbleUser : bubbleAssistant}`}
            >
              <p className="whitespace-pre-wrap">{m.content}</p>
            </div>
          </div>
        ))}
        {sending && (
          <div
            className="flex justify-start"
            role="status"
            aria-live="polite"
            aria-label="Tutor is thinking"
          >
            <div className="inline-flex max-w-[min(100%,36rem)] items-center rounded-3xl rounded-bl-lg border border-[var(--border-default)] bg-[var(--surface-elevated)] px-4 py-3">
              <span
                className="select-none text-lg font-medium leading-none tracking-[0.35em] text-[var(--field-placeholder)] animate-pulse"
                aria-hidden
              >
                ...
              </span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="flex items-center justify-between gap-3 text-xs text-[var(--text-muted)]">
        <span className="tabular-nums" aria-live="polite">
          Your messages:{" "}
          <span className="font-semibold text-[var(--foreground)]">
            {userMessageCount} / {MAX_USER_PRACTICE_MESSAGES}
          </span>
        </span>
        {atUserMessageLimit && !sending ? (
          <span className="text-right text-[var(--prose-text)]">
            Limit reached for this practice.
          </span>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="practice-input" className="sr-only">
          Your message
        </label>
        <textarea
          id="practice-input"
          rows={3}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          disabled={
            !bootstrapDone || sending || loading || atUserMessageLimit || markingDone
          }
          placeholder={
            !bootstrapDone
              ? "…"
              : atUserMessageLimit
                ? "You’ve used all messages for this practice."
                : "Type your answer… (use Send when ready)"
          }
          className="min-h-[5.5rem] w-full resize-y rounded-3xl border border-[var(--field-border)] bg-[var(--field-bg)] px-3 py-3 text-sm leading-relaxed text-[var(--field-text)] placeholder:text-[var(--field-placeholder)] focus:border-[var(--border-strong)] focus:outline-none focus:ring-0 disabled:bg-[var(--surface-elevated)]"
        />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => void handleDonePress()}
            disabled={!bootstrapDone || loading || markingDone}
            className={[
              "shrink-0 rounded-2xl border px-4 py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed",
              meetsCompleteThreshold
                ? "border-[var(--border-strong)] bg-[var(--nav-active-bg)] text-[var(--nav-active-fg)] hover:opacity-90 disabled:opacity-50"
                : "border-[var(--border-default)] bg-[var(--surface-elevated)] text-[var(--field-placeholder)] hover:bg-[var(--surface-elevated)] disabled:opacity-70",
            ].join(" ")}
          >
            {markingDone ? "Saving…" : "Complete lesson"}
          </button>
          <button
            type="button"
            onClick={() => void sendUserMessage()}
            disabled={
              !bootstrapDone ||
              sending ||
              loading ||
              !draft.trim() ||
              atUserMessageLimit ||
              markingDone
            }
            className={`${btnPrimary} shrink-0`}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
