"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import type { RealtimeChannel } from "@supabase/supabase-js";

type Activity = {
  id: string;
  event_type: string;
  status: string;
};

export function CurrentActivities() {
  const router = useRouter();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    const supabase = getSupabase();
    let mounted = true;

    supabase.auth.getUser().then(({ data: { user } }: any) => {
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
        .select("id, event_type, status")
        .eq("user_id", user.id)
        .in("status", ["pending", "processing", "failed"])
        .then(({ data }) => {
          if (mounted && data?.length) setActivities(data);
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

  if (!userId || activities.length === 0) return null;

  return (
    <section className="mb-6">
      <h2 className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
        Current activities
      </h2>
      <div className="mt-3 space-y-2">
        {activities.map((a) => (
          <div
            key={a.id}
            className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white/80 px-4 py-3"
          >
            <span
              className="h-2 w-2 shrink-0 rounded-full bg-slate-400 animate-pulse"
              aria-hidden
            />
            <span className="text-sm text-slate-700">
              {a.event_type === "story_gen" ? "Creating your story…" : "Processing…"}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
