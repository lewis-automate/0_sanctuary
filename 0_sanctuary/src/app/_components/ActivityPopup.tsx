"use client";

import {
  activityStatusLabel,
  isActivityTimedOut,
  progressingTitle,
  useActivityQueue,
} from "@/lib/useActivityQueue";

export function ActivityPopup() {
  const { activities, nowTick } = useActivityQueue();

  if (activities.length === 0) {
    return null;
  }

  return (
    <div
      className="fixed left-[max(1rem,env(safe-area-inset-left))] top-[max(1rem,env(safe-area-inset-top))] z-[58] flex max-w-[min(calc(100vw-5rem),16rem)] flex-col gap-1.5"
      aria-label="Background activity"
      aria-live="polite"
    >
      {activities.map((a) => {
        const timedOut = isActivityTimedOut(a, nowTick);
        return (
          <div
            key={a.id}
            className={[
              "flex items-start gap-2 rounded-2xl border px-3 py-2 shadow-sm backdrop-blur-sm",
              timedOut
                ? "border-[var(--semantic-warning-row-border)] bg-[var(--semantic-warning-row-bg)]/95"
                : "border-[var(--border-default)] bg-[var(--chrome-fab-bg)]/95",
            ].join(" ")}
          >
            {!timedOut ? (
              <span
                className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--semantic-success-icon)] opacity-90 animate-pulse"
                aria-hidden
              />
            ) : (
              <span
                className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--semantic-warning-dot)]"
                aria-hidden
              />
            )}
            <div className="min-w-0 flex-1">
              {timedOut ? (
                <>
                  <p className="text-xs font-medium text-[var(--semantic-warning-title)]">
                    Timed out
                  </p>
                  <p className="mt-0.5 text-[11px] leading-snug text-[var(--prose-text)]">
                    {progressingTitle(a.event_type)}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-xs font-medium leading-snug text-[var(--foreground)]">
                    {progressingTitle(a.event_type)}
                  </p>
                  <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-[var(--text-muted)]">
                    {activityStatusLabel(a.status)}
                  </p>
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
