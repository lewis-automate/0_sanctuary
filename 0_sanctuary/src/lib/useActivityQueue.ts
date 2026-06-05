"use client";

import { useActivityQueueContext } from "@/lib/ActivityQueueProvider";
import {
  activityStatusLabel,
  isActivityTimedOut,
  progressingTitle,
  type ActivityQueueItem,
} from "@/lib/activity-queue-shared";

export function useActivityQueue(): {
  activities: ActivityQueueItem[];
  userId: string | null;
  nowTick: number;
} {
  const { activities, userId, nowTick } = useActivityQueueContext();
  return { activities, userId, nowTick };
}

export {
  activityStatusLabel,
  isActivityTimedOut,
  progressingTitle,
  type ActivityQueueItem,
};
