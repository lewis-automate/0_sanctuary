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
