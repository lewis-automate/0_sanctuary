"use client";

import {
  activityStatusLabel,
  isActivityTimedOut,
  progressingTitle,
  useActivityQueue,
} from "@/lib/useActivityQueue";

export function CurrentActivities() {
  const { activities, userId, nowTick } = useActivityQueue();

  if (!userId) {
    return (
      <p className="text-sm text-[var(--text-muted)]">Checking for active processes…</p>
    );
  }

  if (activities.length === 0) {
    return (
      <p className="text-sm text-[var(--text-muted)]">No active processes right now.</p>
    );
  }

  return (
    <div className="space-y-2">
      {activities.map((a) => {
        const timedOut = isActivityTimedOut(a, nowTick);
        return (
          <div
            key={a.id}
            className={[
              "flex items-start gap-3 rounded-2xl border px-4 py-3",
              timedOut
                ? "border-[var(--semantic-warning-row-border)] bg-[var(--semantic-warning-row-bg)]"
                : "border-[var(--border-default)] bg-[var(--surface-panel)]",
            ].join(" ")}
          >
            {!timedOut ? (
              <span
                className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[var(--semantic-success-icon)] opacity-90 animate-pulse"
                aria-hidden
              />
            ) : (
              <span
                className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[var(--semantic-warning-dot)]"
                aria-hidden
              />
            )}
            <div className="min-w-0 flex-1">
              {timedOut ? (
                <>
                  <p className="text-sm font-medium text-[var(--semantic-warning-title)]">
                    Timed out
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-[var(--prose-text)]">
                    This task did not finish within 10 minutes or could not be
                    completed. Please contact me so I can sort it out.
                  </p>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    {progressingTitle(a.event_type)} · {activityStatusLabel(a.status)}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm font-medium text-[var(--foreground)]">
                    {progressingTitle(a.event_type)}
                  </p>
                  <p className="mt-0.5 text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
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
