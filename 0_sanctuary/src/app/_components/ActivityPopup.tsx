"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import {
  activityStatusLabel,
  isActivityTimedOut,
  progressingTitle,
  useActivityQueue,
} from "@/lib/useActivityQueue";

export function ActivityPopup() {
  const { activities, nowTick } = useActivityQueue();
  const [expanded, setExpanded] = useState(true);

  if (activities.length === 0) {
    return null;
  }

  const timedOutCount = activities.filter((a) =>
    isActivityTimedOut(a, nowTick),
  ).length;
  const activeCount = activities.length - timedOutCount;
  const summaryLabel =
    activities.length === 1
      ? progressingTitle(activities[0]!.event_type)
      : `${activities.length} tasks`;

  return (
    <div
      className="fixed left-[max(1rem,env(safe-area-inset-left))] top-[max(1rem,env(safe-area-inset-top))] z-[58] max-w-[min(calc(100vw-5rem),16rem)]"
      aria-label="Background activity"
    >
      <div className="overflow-hidden rounded-2xl border border-[var(--border-default)] bg-[var(--chrome-fab-bg)]/95 shadow-sm backdrop-blur-sm">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          aria-controls="activity-popup-panel"
          className="flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-[var(--chrome-fab-hover)]/80"
        >
          {activeCount > 0 ? (
            <span
              className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--semantic-success-icon)] opacity-90 animate-pulse"
              aria-hidden
            />
          ) : (
            <span
              className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--semantic-warning-dot)]"
              aria-hidden
            />
          )}
          <span className="min-w-0 flex-1 truncate text-xs font-medium text-[var(--foreground)]">
            {summaryLabel}
          </span>
          {expanded ? (
            <ChevronUp
              className="h-3.5 w-3.5 shrink-0 text-[var(--text-muted)]"
              strokeWidth={2}
              aria-hidden
            />
          ) : (
            <ChevronDown
              className="h-3.5 w-3.5 shrink-0 text-[var(--text-muted)]"
              strokeWidth={2}
              aria-hidden
            />
          )}
        </button>

        {expanded ? (
          <div
            id="activity-popup-panel"
            className="flex flex-col gap-1.5 border-t border-[var(--border-default)]/80 px-2 pb-2 pt-1.5"
            aria-live="polite"
          >
            {activities.map((a) => {
              const timedOut = isActivityTimedOut(a, nowTick);
              return (
                <div
                  key={a.id}
                  className={[
                    "flex items-start gap-2 rounded-xl border px-2.5 py-2",
                    timedOut
                      ? "border-[var(--semantic-warning-row-border)] bg-[var(--semantic-warning-row-bg)]/90"
                      : "border-[var(--border-default)]/80 bg-[var(--surface-panel)]/80",
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
        ) : null}
      </div>
    </div>
  );
}
