"use client";

import { useRouter } from "next/navigation";
import { useId, useState, type ReactNode } from "react";
import { queueStoryGeneration } from "../create/actions";
import { EMPTY_STORY_GEN_PAYLOAD } from "../create/story-gen-payload";

type Props = {
  className: string;
  titleClassName: string;
  subClassName: string;
  /** When true, only the title row is shown (pending state moves into the title). */
  compact?: boolean;
  leadingIcon?: ReactNode;
};

export function QuickCreateStoryButton({
  className,
  titleClassName,
  subClassName,
  compact = false,
  leadingIcon,
}: Props) {
  const dialogTitleId = useId();
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const btnSecondary =
    "rounded-2xl border border-[var(--border-default)] bg-[var(--field-bg)] px-4 py-2.5 text-sm font-medium text-[var(--field-text)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-elevated)]";

  const btnPrimary =
    "rounded-2xl border border-[var(--border-strong)] bg-[var(--nav-active-bg)] px-4 py-2.5 text-sm font-medium text-[var(--nav-active-fg)] transition-colors hover:opacity-90";

  async function runQuickCreate() {
    setError(null);
    setDialogOpen(false);
    setPending(true);
    const result = await queueStoryGeneration(EMPTY_STORY_GEN_PAYLOAD);
    setPending(false);
    if (result.ok) {
      router.refresh();
    } else {
      setError(result.error);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-1">
      <button
        type="button"
        className={`${className} h-full min-h-0 ${leadingIcon ? "gap-3" : "gap-2"}`}
        onClick={() => setDialogOpen(true)}
        disabled={pending}
        aria-busy={pending}
      >
        {leadingIcon ? (
          <span
            className="flex w-10 shrink-0 items-center justify-start self-stretch text-[var(--text-muted)] [&_svg]:block"
            aria-hidden
          >
            {leadingIcon}
          </span>
        ) : null}
        <span className={titleClassName}>
          {compact && pending ? "Queuing…" : "Quick create"}
        </span>
        {compact ? null : (
          <span className={subClassName}>
            {pending
              ? "Queuing…"
              : "Generate a passage using your current settings"}
          </span>
        )}
      </button>
      {error ? (
        <p className="px-1 text-xs text-[var(--semantic-danger-inline)]" role="alert">
          {error}
        </p>
      ) : null}

      {dialogOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="presentation"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/45"
            aria-label="Close dialog"
            onClick={() => setDialogOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={dialogTitleId}
            className="relative z-10 w-full max-w-md rounded-3xl border border-[var(--border-default)] bg-[var(--surface-panel-solid)] p-6 shadow-lg"
          >
            <h2
              id={dialogTitleId}
              className="text-base font-semibold text-[var(--foreground)]"
            >
              Create?
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-[var(--text-muted)]">
              This uses your current profile settings to generate new reading material.
            </p>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                className={btnSecondary}
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </button>
              <button type="button" className={btnPrimary} onClick={runQuickCreate}>
                Create
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
