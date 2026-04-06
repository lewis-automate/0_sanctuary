"use client";

import type { RealtimePostgresChangesPayload } from "@supabase/realtime-js";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { getSupabase } from "@/lib/supabase";

type ActivityRow = {
  id: string;
  event_type: string;
  status: string;
  payload: unknown;
};

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

function shouldRefreshOnRowChange(row: ActivityRow | null): boolean {
  if (!row) return false;
  const et = row.event_type;
  if (et !== "progress_update" && et !== "feedback_reviewed") return false;
  const st = (row.status ?? "").trim().toLowerCase();
  return st === "completed" || st === "failed";
}

/**
 * Tracks `activity_queue` rows so UIs can show “Processing” for in-flight
 * `progress_update` (by story_id) and `feedback_reviewed` (by feedback_id).
 */
export function useActivityQueueProcessingTargets(): {
  progressStoryIds: ReadonlySet<string>;
  feedbackReviewIds: ReadonlySet<string>;
} {
  const router = useRouter();
  const channelId = useId().replace(/:/g, "");
  const [progressStoryIds, setProgressStoryIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [feedbackReviewIds, setFeedbackReviewIds] = useState<Set<string>>(
    () => new Set(),
  );
  const channelRef = useRef<RealtimeChannel | null>(null);

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
      }
      setProgressStoryIds(nextProgress);
      setFeedbackReviewIds(nextFeedback);
    }

    supabase.auth.getUser().then((res: { data: { user: { id: string } | null } }) => {
      const user = res.data.user;
      if (!mounted || !user) return;

      const channel = supabase
        .channel(`activity_queue_processing_targets_${channelId}`)
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
              addRowTargets(payload.new as ActivityRow);
              return;
            }
            if (payload.eventType === "UPDATE") {
              removeRowTargets(payload.old as ActivityRow);
              addRowTargets(payload.new as ActivityRow);
              const n = payload.new as ActivityRow;
              if (shouldRefreshOnRowChange(n)) {
                router.refresh();
              }
              return;
            }
            if (payload.eventType === "DELETE") {
              removeRowTargets(payload.old as ActivityRow);
              router.refresh();
            }
          },
        )
        .subscribe();
      channelRef.current = channel;

      supabase
        .from("activity_queue")
        .select("id, event_type, status, payload")
        .eq("user_id", user.id)
        .in("status", ["pending", "processing"])
        .then(({ data }: { data: ActivityRow[] | null }) => {
          if (mounted && data?.length) {
            reconcileFromRows(data);
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
  }, [router, channelId]);

  return { progressStoryIds, feedbackReviewIds };
}
