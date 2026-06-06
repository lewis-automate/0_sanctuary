"use client";

import { useRouter } from "next/navigation";
import { useId, useState, type ReactNode } from "react";
import { queueStoryGeneration } from "../create/actions";
import { EMPTY_STORY_GEN_PAYLOAD } from "../create/story-gen-payload";

type Props = {
  className: string;
  titleClassName: string;
  subClassName: string;
  /** When true, title-only unless `compactSubtitle` is set. */
  compact?: boolean;
  /** Shown in compact mode when provided (e.g. home action tile subtitle). */
  compactSubtitle?: string;
  /** Button label (default: Quick create). */
  title?: string;
  leadingIcon?: ReactNode;
  /** Vertical stacks icon, title, subtitle like home action tiles. */
  layout?: "horizontal" | "vertical";
  iconBadgeClassName?: string;
};

export function QuickCreateStoryButton({
  className,
  titleClassName,
  subClassName,
  compact = false,
  compactSubtitle,
  title = "Quick create",
  leadingIcon,
  layout = "horizontal",
  iconBadgeClassName,
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

  const isVertical = layout === "vertical";
  const showCompactSubtitle = compact && compactSubtitle && !pending;
  const showFullSubtitle = !compact;

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

  const iconWrapperClass = isVertical
    ? iconBadgeClassName ??
      "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-elevated)] text-[var(--nav-idle-text)] ring-1 ring-[var(--border-default)] [&_svg]:block"
    : "flex w-10 shrink-0 items-center justify-start self-stretch text-[var(--text-muted)] [&_svg]:block";

  return (
    <div className="flex h-full min-h-0 flex-col gap-1">
      <button
        type="button"
        className={[
          className,
          "h-full min-h-0",
          isVertical
            ? "flex-col items-start gap-2"
            : leadingIcon
              ? "gap-3"
              : "gap-2",
        ].join(" ")}
        onClick={() => setDialogOpen(true)}
        disabled={pending}
        aria-busy={pending}
      >
        {leadingIcon ? (
          <span className={iconWrapperClass} aria-hidden>
            {leadingIcon}
          </span>
        ) : null}
        {isVertical ? (
          <span className="flex min-w-0 flex-col gap-0.5 text-left">
            <span className={titleClassName}>
              {compact && pending ? "Queuing…" : title}
            </span>
            {showCompactSubtitle ? (
              <span className={subClassName}>{compactSubtitle}</span>
            ) : pending && compact ? (
              <span className={subClassName}>Queuing…</span>
            ) : null}
          </span>
        ) : (
          <>
            <span className={titleClassName}>
              {compact && pending ? "Queuing…" : title}
            </span>
            {showFullSubtitle ? (
              <span className={subClassName}>
                {pending
                  ? "Queuing…"
                  : "Generate a passage using your current settings"}
              </span>
            ) : null}
          </>
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
