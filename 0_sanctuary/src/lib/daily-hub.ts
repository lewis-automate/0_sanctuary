import { isReaderHref } from "@/lib/quick-read";

export type DailyPrimaryAction = {
  label: string;
  href: string;
  hint: string;
};

export function resolveDailyPrimaryAction(
  quickReadHref: string,
  unreviewedFeedbackCount: number,
): DailyPrimaryAction {
  if (isReaderHref(quickReadHref)) {
    return {
      label: "Quick read",
      href: quickReadHref,
      hint: "Your next unread story is waiting",
    };
  }

  if (unreviewedFeedbackCount > 0) {
    const n =
      unreviewedFeedbackCount === 1
        ? "1 piece of feedback"
        : `${unreviewedFeedbackCount} pieces of feedback`;
    return {
      label: "Review writing",
      href: "/writing?tab=thoughts",
      hint: `${n} to read`,
    };
  }

  return {
    label: "Review vocab",
    href: "/vocab?tab=review&flow=rapid-review",
    hint: "Keep your words fresh",
  };
}
