"use client";

import { useActivityQueueContext } from "@/lib/ActivityQueueProvider";

export function useActivityQueueProcessingTargets(): {
  progressStoryIds: ReadonlySet<string>;
  feedbackReviewIds: ReadonlySet<string>;
} {
  const { progressStoryIds, feedbackReviewIds } = useActivityQueueContext();
  return { progressStoryIds, feedbackReviewIds };
}

export function useRapidReviewReportPending(): boolean {
  return useActivityQueueContext().rapidReviewReportPending;
}
