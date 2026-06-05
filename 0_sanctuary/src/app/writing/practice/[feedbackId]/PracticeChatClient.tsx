"use client";

import { ArrowLeft, CircleHelp, SendHorizontal } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import { queueFeedbackReviewed } from "@/app/vocab/actions";
import { cancelPendingNavigation } from "@/app/_components/NavigationLoadingOverlay";
import {
  MAX_USER_PRACTICE_CHARS,
  MAX_USER_PRACTICE_MESSAGES,
  MIN_USER_MESSAGES_FOR_PRACTICE_COMPLETE,
} from "@/lib/practice-user-message-limit";

type ChatMessage = { role: "user" | "assistant"; content: string };
type StudyItemSnapshot = {
  rawInput: string;
  alternateVersion: string | null;
  feedback: string | null;
  focusPoint: string | null;
};

type Props = {
  feedbackId: string;
  studyItem: StudyItemSnapshot;
};

const btnPrimary =
  "rounded-2xl border border-[var(--border-strong)] bg-[var(--nav-active-bg)] px-4 py-2.5 text-sm font-medium text-[var(--nav-active-fg)] transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50";

const btnSecondary =
  "rounded-2xl border border-[var(--border-default)] bg-[var(--field-bg)] px-4 py-2.5 text-sm font-medium text-[var(--field-text)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-elevated)]";

const bubbleUser =
  "rounded-3xl rounded-br-lg border border-[var(--field-border)] bg-[var(--field-bg)] px-4 py-3 text-sm leading-relaxed text-[var(--field-text)]";
const bubbleAssistant =
  "rounded-3xl rounded-bl-lg border border-[var(--border-default)] bg-[var(--surface-elevated)] px-4 py-3 text-sm leading-relaxed text-[var(--prose-text)]";

/** Styled elements for tutor Markdown (headings, lists, bold from the model). */
const PRACTICE_MARKDOWN_COMPONENTS: Components = {
  h1: ({ children }) => (
    <h1 className="mt-4 mb-2 border-b border-[var(--border-default)] pb-1.5 text-base font-semibold text-[var(--foreground)] first:mt-0">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="mt-4 mb-2 text-base font-semibold text-[var(--foreground)] first:mt-0">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="mt-3 mb-2 text-base font-semibold text-[var(--foreground)] first:mt-0">
      {children}
    </h3>
  ),
  h4: ({ children }) => (
    <h4 className="mt-3 mb-1.5 text-sm font-semibold text-[var(--foreground)] first:mt-0">
      {children}
    </h4>
  ),
  p: ({ children }) => (
    <p className="mb-2 text-sm leading-relaxed text-[var(--prose-text)] last:mb-0">
      {children}
    </p>
  ),
  ul: ({ children }) => (
    <ul className="mb-2 list-disc space-y-1 pl-5 text-sm leading-relaxed text-[var(--prose-text)] last:mb-0">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-2 list-decimal space-y-1 pl-5 text-sm leading-relaxed text-[var(--prose-text)] last:mb-0">
      {children}
    </ol>
  ),
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  strong: ({ children }) => (
    <strong className="font-semibold text-[var(--foreground)]">{children}</strong>
  ),
  em: ({ children }) => <em className="italic">{children}</em>,
  hr: () => <hr className="my-3 border-[var(--border-default)]" />,
  blockquote: ({ children }) => (
    <blockquote className="my-2 border-l-2 border-[var(--border-strong)] pl-3 text-sm text-[var(--text-muted)]">
      {children}
    </blockquote>
  ),
  a: ({ href, children }) => (
    <a
      href={href}
      className="font-medium text-[var(--nav-active-bg)] underline underline-offset-2 hover:opacity-90"
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
    </a>
  ),
  pre: ({ children }) => (
    <pre className="my-2 overflow-x-auto rounded-xl border border-[var(--border-default)] bg-[var(--field-bg)] p-3 text-xs text-[var(--field-text)]">
      {children}
    </pre>
  ),
  code: ({ className, children }) => {
    const isBlock = Boolean(className);
    if (isBlock) {
      return <code className={className}>{children}</code>;
    }
    return (
      <code className="rounded-md border border-[var(--border-default)] bg-[var(--field-bg)] px-1 py-0.5 font-mono text-[0.8em] text-[var(--foreground)]">
        {children}
      </code>
    );
  },
};

export function PracticeChatClient({ feedbackId, studyItem }: Props) {
  const router = useRouter();
  const incompleteDialogTitleId = useId();
  const completeConfirmTitleId = useId();
  const studyInfoDialogTitleId = useId();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [bootstrapDone, setBootstrapDone] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [languagesRequired, setLanguagesRequired] = useState(false);
  const [incompleteDialogOpen, setIncompleteDialogOpen] = useState(false);
  const [completeConfirmOpen, setCompleteConfirmOpen] = useState(false);
  const [studyInfoDialogOpen, setStudyInfoDialogOpen] = useState(false);
  const [markingDone, setMarkingDone] = useState(false);

  const lastMessageRowRef = useRef<HTMLDivElement | null>(null);
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

  useLayoutEffect(() => {
    if (messages.length === 0) return;
    const onlyInitialAssistant =
      messages.length === 1 && messages[0].role === "assistant" && !sending;
    if (onlyInitialAssistant) return;

    lastMessageRowRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
      inline: "nearest",
    });
  }, [messages, sending]);

  const markPracticedIfNeeded = useCallback(async () => {
    if (markedPracticedRef.current) {
      return { ok: true } as const;
    }
    const result = await queueFeedbackReviewed({
      feedback_id: feedbackId,
      reviewed: true,
      focus_point: studyItem.focusPoint,
    });
    if (result.ok) {
      markedPracticedRef.current = true;
    }
    return result;
  }, [feedbackId, studyItem.focusPoint]);

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
          focus_point: studyItem.focusPoint,
        }).then((r) => {
          if (r.ok) markedPracticedRef.current = true;
        });
      }
    };
  }, [feedbackId, studyItem.focusPoint]);

  function openIncompleteOrLeave() {
    if (meetsCompleteThreshold) {
      void completeAndContinue();
    } else {
      setIncompleteDialogOpen(true);
    }
  }

  function dismissIncompleteDialog() {
    setIncompleteDialogOpen(false);
    cancelPendingNavigation();
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

    const prior = messages;
    const userMessage: ChatMessage = { role: "user", content: text };
    setMessages([...prior, userMessage]);
    setDraft("");
    setSending(true);
    setError(null);

    try {
      const res = await fetch("/api/practice-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedbackId, messages: [...prior, userMessage] }),
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
      setMessages([...prior, userMessage, { role: "assistant", content: reply }]);
    } catch (err) {
      setMessages(prior);
      setError(err instanceof Error ? err.message : "Could not send message.");
      setDraft(text);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="flex shrink-0 items-center justify-start gap-3 pt-1">
        <button
          type="button"
          onClick={() => void handleBackPress()}
          disabled={markingDone}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--border-default)] bg-[var(--chrome-fab-bg)] text-[var(--foreground)] shadow-sm backdrop-blur transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--chrome-fab-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--foreground)]/15 disabled:opacity-50"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5 shrink-0" aria-hidden />
        </button>
        <button
          type="button"
          onClick={() => setStudyInfoDialogOpen(true)}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--border-default)] bg-[var(--chrome-fab-bg)] text-[var(--foreground)] shadow-sm backdrop-blur transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--chrome-fab-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--foreground)]/15"
          aria-label="Show lesson source details"
        >
          <CircleHelp className="h-5 w-5 shrink-0" aria-hidden />
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
            onClick={dismissIncompleteDialog}
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
                onClick={dismissIncompleteDialog}
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

      {studyInfoDialogOpen ? (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center p-4"
          role="presentation"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/45"
            aria-label="Close dialog"
            onClick={() => setStudyInfoDialogOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={studyInfoDialogTitleId}
            className="relative z-10 w-full max-w-2xl rounded-3xl border border-[var(--border-default)] bg-[var(--surface-panel-solid)] p-5 shadow-lg"
          >
            <h2
              id={studyInfoDialogTitleId}
              className="text-base font-semibold text-[var(--foreground)]"
            >
              Lesson source
            </h2>
            <div className="mt-4 max-h-[min(65vh,34rem)] space-y-4 overflow-y-auto pr-1">
              <section className="space-y-1">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                  Original text
                </h3>
                <p className="whitespace-pre-wrap rounded-2xl border border-[var(--border-default)] bg-[var(--surface-panel)] px-3 py-2 text-sm leading-relaxed text-[var(--prose-text)]">
                  {studyItem.rawInput.trim() ? studyItem.rawInput : "—"}
                </p>
              </section>
              <section className="space-y-1">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                  Alternate version
                </h3>
                <p className="whitespace-pre-wrap rounded-2xl border border-[var(--border-default)] bg-[var(--surface-panel)] px-3 py-2 text-sm leading-relaxed text-[var(--prose-text)]">
                  {studyItem.alternateVersion?.trim() || "—"}
                </p>
              </section>
              <section className="space-y-1">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                  Feedback
                </h3>
                <p className="whitespace-pre-wrap rounded-2xl border border-[var(--border-default)] bg-[var(--surface-panel)] px-3 py-2 text-sm leading-relaxed text-[var(--prose-text)]">
                  {studyItem.feedback?.trim() || "—"}
                </p>
              </section>
              <section className="space-y-1">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                  Focus point
                </h3>
                <p className="whitespace-pre-wrap rounded-2xl border border-[var(--border-default)] bg-[var(--surface-panel)] px-3 py-2 text-sm leading-relaxed text-[var(--prose-text)]">
                  {studyItem.focusPoint?.trim() || "—"}
                </p>
              </section>
            </div>
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                className={btnSecondary}
                onClick={() => setStudyInfoDialogOpen(false)}
              >
                Close
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
        className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto rounded-3xl border border-[var(--border-default)] bg-[var(--surface-panel)] p-4 sm:p-5 [overflow-anchor:none]"
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
            ref={i === messages.length - 1 ? lastMessageRowRef : undefined}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`${m.role === "user" ? "max-w-[min(100%,36rem)]" : "w-full"} ${m.role === "user" ? bubbleUser : bubbleAssistant}`}
            >
              {m.role === "user" ? (
                <p className="whitespace-pre-wrap">{m.content}</p>
              ) : (
                <div className="min-w-0 break-words">
                  <ReactMarkdown components={PRACTICE_MARKDOWN_COMPONENTS}>
                    {m.content}
                  </ReactMarkdown>
                </div>
              )}
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
            <div className="inline-flex w-full items-center rounded-3xl rounded-bl-lg border border-[var(--border-default)] bg-[var(--surface-elevated)] px-4 py-3">
              <span
                className="select-none text-lg font-medium leading-none tracking-[0.35em] text-[var(--field-placeholder)] animate-pulse"
                aria-hidden
              >
                ...
              </span>
            </div>
          </div>
        )}
      </div>

      <div
        className="shrink-0 border-t border-[var(--border-default)] bg-[var(--background)] pt-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-[0_-6px_18px_rgba(0,0,0,0.06)]"
      >
        <div className="mb-2 flex items-center justify-between gap-3 text-xs text-[var(--text-muted)]">
          <span className="tabular-nums" aria-live="polite">
            Your messages:{" "}
            <span className="font-semibold text-[var(--foreground)]">
              {userMessageCount} / {MAX_USER_PRACTICE_MESSAGES}
            </span>
          </span>
          <span className="text-right tabular-nums">
            {draft.length} / {MAX_USER_PRACTICE_CHARS}
          </span>
        </div>
        {atUserMessageLimit && !sending ? (
          <div className="mb-2 text-right text-xs text-[var(--prose-text)]">
            Limit reached for this practice.
          </div>
        ) : null}

        <div
          className="rounded-3xl border border-[var(--field-border)] bg-[var(--field-bg)] transition-colors focus-within:border-[var(--border-strong)] focus-within:ring-1 focus-within:ring-[var(--foreground)]/10"
        >
          <label htmlFor="practice-input" className="sr-only">
            Your message
          </label>
          <textarea
            id="practice-input"
            rows={3}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={MAX_USER_PRACTICE_CHARS}
            onKeyDown={(e) => {
              if (e.key !== "Enter" || e.shiftKey || e.nativeEvent.isComposing) {
                return;
              }
              e.preventDefault();
              void sendUserMessage();
            }}
            disabled={
              !bootstrapDone || sending || loading || atUserMessageLimit || markingDone
            }
            placeholder={
              !bootstrapDone
                ? "…"
                : atUserMessageLimit
                  ? "You’ve used all messages for this practice."
                  : "Type your answer…"
            }
            className="min-h-[4.75rem] w-full resize-y border-0 bg-transparent px-3 pt-3 pb-2 text-sm leading-relaxed text-[var(--field-text)] placeholder:text-[var(--field-placeholder)] focus:outline-none focus:ring-0 disabled:bg-transparent disabled:text-[var(--field-placeholder)]"
          />
          <div className="flex items-center justify-between gap-2 border-t border-[var(--border-default)] px-2 py-1.5">
            <button
              type="button"
              onClick={() => void handleDonePress()}
              disabled={!bootstrapDone || loading || markingDone}
              className={[
                "min-h-8 shrink-0 rounded-xl border px-2.5 py-1 text-xs font-medium transition-colors disabled:cursor-not-allowed",
                meetsCompleteThreshold
                  ? "border-[var(--border-strong)] bg-[var(--nav-active-bg)] text-[var(--nav-active-fg)] hover:opacity-90 disabled:opacity-50"
                  : "border-transparent text-[var(--text-muted)] hover:border-[var(--border-default)] hover:bg-[var(--surface-elevated)] hover:text-[var(--prose-text)] disabled:opacity-60",
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
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[var(--border-strong)] bg-[var(--nav-active-bg)] text-[var(--nav-active-fg)] transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:border-[var(--border-default)] disabled:bg-[var(--surface-elevated)] disabled:text-[var(--field-placeholder)] disabled:opacity-70"
              aria-label="Send message"
            >
              <SendHorizontal className="h-4 w-4 shrink-0" aria-hidden />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
