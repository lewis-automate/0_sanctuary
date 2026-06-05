"use client";

import type { RealtimePostgresChangesPayload } from "@supabase/realtime-js";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";
import { getSupabase } from "@/lib/supabase";
import type { ActivityQueueItem } from "@/lib/activity-queue-shared";

type ActivityRow = {
  id: string;
  event_type: string;
  status: string;
  payload: unknown;
  created_at?: string | null;
};

type ActivityQueueContextValue = {
  activities: ActivityQueueItem[];
  userId: string | null;
  nowTick: number;
  progressStoryIds: ReadonlySet<string>;
  feedbackReviewIds: ReadonlySet<string>;
  rapidReviewReportPending: boolean;
};

const ActivityQueueContext = createContext<ActivityQueueContextValue | null>(
  null,
);

function normalizePayload(payload: unknown): Record<string, unknown> | null {
  if (payload == null) return null;
  if (typeof payload === "string") {
    try {
      const p = JSON.parse(payload) as unknown;
      return p && typeof p === "object" && !Array.isArray(p)
        ? (p as Record<string, unknown>)
        : null;
    } catch {
      return null;
    }
  }
  if (typeof payload === "object" && !Array.isArray(payload)) {
    return payload as Record<string, unknown>;
  }
  return null;
}

function parseStoryIdFromProgressPayload(payload: unknown): string | null {
  const o = normalizePayload(payload);
  if (!o) return null;
  const sid = o.story_id;
  return typeof sid === "string" && sid.length > 0 ? sid : null;
}

function parseFeedbackIdFromPayload(payload: unknown): string | null {
  const o = normalizePayload(payload);
  if (!o) return null;
  const fid = o.feedback_id;
  return typeof fid === "string" && fid.length > 0 ? fid : null;
}

function isPendingOrProcessing(status: string | undefined): boolean {
  const s = (status ?? "").trim().toLowerCase();
  return s === "pending" || s === "processing";
}

export function ActivityQueueProvider({ children }: PropsWithChildren) {
  const router = useRouter();
  const [activities, setActivities] = useState<ActivityQueueItem[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [nowTick, setNowTick] = useState(() => Date.now());
  const [progressStoryIds, setProgressStoryIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [feedbackReviewIds, setFeedbackReviewIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [rapidReviewReportPending, setRapidReviewReportPending] =
    useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleRefresh = useCallback(() => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    refreshTimerRef.current = setTimeout(() => {
      refreshTimerRef.current = null;
      router.refresh();
    }, 300);
  }, [router]);

  useEffect(() => {
    const id = window.setInterval(() => setNowTick(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const supabase = getSupabase();
    let mounted = true;

    function removeRowTargets(row: ActivityRow | null) {
      if (!row || !isPendingOrProcessing(row.status)) return;
      if (row.event_type === "progress_update") {
        const sid = parseStoryIdFromProgressPayload(row.payload);
        if (sid) {
          setProgressStoryIds((prev) => {
            const next = new Set(prev);
            next.delete(sid);
            return next;
          });
        }
      }
      if (row.event_type === "feedback_reviewed") {
        const fid = parseFeedbackIdFromPayload(row.payload);
        if (fid) {
          setFeedbackReviewIds((prev) => {
            const next = new Set(prev);
            next.delete(fid);
            return next;
          });
        }
      }
    }

    function addRowTargets(row: ActivityRow | null) {
      if (!row || !isPendingOrProcessing(row.status)) return;
      if (row.event_type === "progress_update") {
        const sid = parseStoryIdFromProgressPayload(row.payload);
        if (sid) {
          setProgressStoryIds((prev) => new Set(prev).add(sid));
        }
      }
      if (row.event_type === "feedback_reviewed") {
        const fid = parseFeedbackIdFromPayload(row.payload);
        if (fid) {
          setFeedbackReviewIds((prev) => new Set(prev).add(fid));
        }
      }
    }

    function reconcileFromRows(rows: ActivityRow[]) {
      const nextProgress = new Set<string>();
      const nextFeedback = new Set<string>();
      let rapidPending = false;
      for (const row of rows) {
        if (!isPendingOrProcessing(row.status)) continue;
        if (row.event_type === "progress_update") {
          const sid = parseStoryIdFromProgressPayload(row.payload);
          if (sid) nextProgress.add(sid);
        }
        if (row.event_type === "feedback_reviewed") {
          const fid = parseFeedbackIdFromPayload(row.payload);
          if (fid) nextFeedback.add(fid);
        }
        if (row.event_type === "rapid_review_complete") {
          rapidPending = true;
        }
      }
      setProgressStoryIds(nextProgress);
      setFeedbackReviewIds(nextFeedback);
      setRapidReviewReportPending(rapidPending);
    }

    async function refreshRapidReviewPending(uid: string) {
      const { data } = await supabase
        .from("activity_queue")
        .select("id")
        .eq("user_id", uid)
        .eq("event_type", "rapid_review_complete")
        .in("status", ["pending", "processing"]);
      if (mounted) {
        setRapidReviewReportPending(Array.isArray(data) && data.length > 0);
      }
    }

    supabase.auth
      .getUser()
      .then(({ data: { user } }: { data: { user: { id: string } | null } }) => {
      if (!mounted || !user) return;
      setUserId(user.id);

      supabase
        .from("activity_queue")
        .select("id, event_type, status, created_at, payload")
        .eq("user_id", user.id)
        .in("status", ["pending", "processing", "failed"])
        .then(({ data }: { data: ActivityRow[] | null }) => {
          if (!mounted || !data?.length) return;
          const rows = data as ActivityRow[];
          setActivities(
            rows.map((r) => ({
              id: r.id,
              event_type: r.event_type,
              status: r.status,
              created_at: r.created_at ?? null,
            })),
          );
          reconcileFromRows(rows);
        });

      void refreshRapidReviewPending(user.id);

      const channel = supabase
        .channel("activity_queue_unified")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "activity_queue",
            filter: `user_id=eq.${user.id}`,
          },
          (payload: RealtimePostgresChangesPayload<ActivityRow>) => {
            if (payload.eventType === "INSERT") {
              const row = payload.new as ActivityRow;
              addRowTargets(row);
              if (row.event_type === "rapid_review_complete") {
                setRapidReviewReportPending(true);
              }
              if (row.status !== "completed") {
                setActivities((prev) => [
                  ...prev.filter((a) => a.id !== row.id),
                  {
                    id: row.id,
                    event_type: row.event_type,
                    status: row.status,
                    created_at: row.created_at ?? null,
                  },
                ]);
              }
              return;
            }

            if (payload.eventType === "UPDATE") {
              const row = payload.new as ActivityRow;
              removeRowTargets(payload.old as ActivityRow);
              addRowTargets(row);
              if (row.event_type === "rapid_review_complete") {
                void refreshRapidReviewPending(user.id);
              }
              if (row.status === "completed") {
                setActivities((prev) => prev.filter((a) => a.id !== row.id));
                scheduleRefresh();
              } else {
                setActivities((prev) =>
                  prev.map((a) =>
                    a.id === row.id
                      ? {
                          id: row.id,
                          event_type: row.event_type,
                          status: row.status,
                          created_at: row.created_at ?? null,
                        }
                      : a,
                  ),
                );
              }
              return;
            }

            if (payload.eventType === "DELETE") {
              removeRowTargets(payload.old as ActivityRow);
              const row = payload.old as ActivityRow;
              setActivities((prev) => prev.filter((a) => a.id !== row.id));
              if (row.event_type === "rapid_review_complete") {
                void refreshRapidReviewPending(user.id);
              }
              scheduleRefresh();
            }
          },
        )
        .subscribe();
      channelRef.current = channel;
    });

    return () => {
      mounted = false;
      const ch = channelRef.current;
      if (ch) {
        supabase.removeChannel(ch);
        channelRef.current = null;
      }
    };
  }, [scheduleRefresh]);

  return (
    <ActivityQueueContext.Provider
      value={{
        activities,
        userId,
        nowTick,
        progressStoryIds,
        feedbackReviewIds,
        rapidReviewReportPending,
      }}
    >
      {children}
    </ActivityQueueContext.Provider>
  );
}

export function useActivityQueueContext(): ActivityQueueContextValue {
  const ctx = useContext(ActivityQueueContext);
  if (!ctx) {
    throw new Error(
      "useActivityQueueContext must be used within ActivityQueueProvider",
    );
  }
  return ctx;
}
