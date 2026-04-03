"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import type { RealtimeChannel } from "@supabase/supabase-js";

type Activity = {
  id: string;
  event_type: string;
  status: string;
  created_at: string | null;
};

const TIMEOUT_MS = 10 * 60 * 1000;

function progressingTitle(eventType: string): string {
  switch (eventType) {
    case "story_gen":
      return "Progressing story creation";
    case "progress_update":
      return "Progressing read story";
    case "user_settings":
      return "Progressing user settings";
    case "feedback_reviewed":
      return "Progressing writing feedback";
    case "rapid_review_complete":
      return "Progressing rapid review";
    case "write_now_submit":
      return "Progressing write now";
    case "add_vocab_submit":
      return "Progressing add vocab";
    default:
      return "Progressing background task";
  }
}

function statusLabel(status: string): string {
  const s = status.trim().toLowerCase();
  if (s === "pending") return "Pending";
  if (s === "processing") return "Processing";
  if (s === "failed") return "Failed";
  return status.replace(/_/g, " ");
}

function isTimedOut(a: Activity, nowMs: number): boolean {
  if (a.status === "failed") return true;
  if (a.status !== "pending" && a.status !== "processing") return false;
  if (!a.created_at) return false;
  const started = new Date(a.created_at).getTime();
  if (!Number.isFinite(started)) return false;
  return nowMs - started > TIMEOUT_MS;
}

export function CurrentActivities() {
  const router = useRouter();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [nowTick, setNowTick] = useState(() => Date.now());
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    const id = window.setInterval(() => setNowTick(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const supabase = getSupabase();
    let mounted = true;

    supabase.auth.getUser().then(({ data: { user } }: { data: { user: { id: string } | null } }) => {
      if (!mounted || !user) return;
      setUserId(user.id);

      const channel = supabase
        .channel("activity_queue")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "activity_queue",
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            if (payload.eventType === "INSERT") {
              const row = payload.new as Activity;
              if (row.status !== "completed") {
                setActivities((prev) => [...prev.filter((a) => a.id !== row.id), row]);
              }
            } else if (payload.eventType === "UPDATE") {
              const row = payload.new as Activity;
              if (row.status === "completed") {
                setActivities((prev) => prev.filter((a) => a.id !== row.id));
                router.refresh();
              } else {
                setActivities((prev) =>
                  prev.map((a) => (a.id === row.id ? row : a)),
                );
              }
            } else if (payload.eventType === "DELETE") {
              const row = payload.old as Activity;
              setActivities((prev) => prev.filter((a) => a.id !== row.id));
              router.refresh();
            }
          },
        )
        .subscribe();
      channelRef.current = channel;

      supabase
        .from("activity_queue")
        .select("id, event_type, status, created_at")
        .eq("user_id", user.id)
        .in("status", ["pending", "processing", "failed"])
        .then(({ data }) => {
          if (mounted && data?.length) {
            setActivities(data as Activity[]);
          }
        });
    });

    return () => {
      mounted = false;
      const ch = channelRef.current;
      if (ch) {
        supabase.removeChannel(ch);
        channelRef.current = null;
      }
    };
  }, [router]);

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
        const timedOut = isTimedOut(a, nowTick);
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
                    {progressingTitle(a.event_type)} · {statusLabel(a.status)}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm font-medium text-[var(--foreground)]">
                    {progressingTitle(a.event_type)}
                  </p>
                  <p className="mt-0.5 text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
                    {statusLabel(a.status)}
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
