"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { RealtimePostgresChangesPayload } from "@supabase/realtime-js";

export type ActivityQueueItem = {
  id: string;
  event_type: string;
  status: string;
  created_at: string | null;
};

const TIMEOUT_MS = 10 * 60 * 1000;

export function progressingTitle(eventType: string): string {
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

export function activityStatusLabel(status: string): string {
  const s = status.trim().toLowerCase();
  if (s === "pending") return "Pending";
  if (s === "processing") return "Processing";
  if (s === "failed") return "Failed";
  return status.replace(/_/g, " ");
}

export function isActivityTimedOut(a: ActivityQueueItem, nowMs: number): boolean {
  if (a.status === "failed") return true;
  if (a.status !== "pending" && a.status !== "processing") return false;
  if (!a.created_at) return false;
  const started = new Date(a.created_at).getTime();
  if (!Number.isFinite(started)) return false;
  return nowMs - started > TIMEOUT_MS;
}

export function useActivityQueue() {
  const router = useRouter();
  const [activities, setActivities] = useState<ActivityQueueItem[]>([]);
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
          (payload: RealtimePostgresChangesPayload<ActivityQueueItem>) => {
            if (payload.eventType === "INSERT") {
              const row = payload.new as ActivityQueueItem;
              if (row.status !== "completed") {
                setActivities((prev) => [...prev.filter((a) => a.id !== row.id), row]);
              }
            } else if (payload.eventType === "UPDATE") {
              const row = payload.new as ActivityQueueItem;
              if (row.status === "completed") {
                setActivities((prev) => prev.filter((a) => a.id !== row.id));
                router.refresh();
              } else {
                setActivities((prev) =>
                  prev.map((a) => (a.id === row.id ? row : a)),
                );
              }
            } else if (payload.eventType === "DELETE") {
              const row = payload.old as ActivityQueueItem;
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
        .then(({ data }: { data: ActivityQueueItem[] | null }) => {
          if (mounted && data?.length) {
            setActivities(data);
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

  return { activities, userId, nowTick };
}
