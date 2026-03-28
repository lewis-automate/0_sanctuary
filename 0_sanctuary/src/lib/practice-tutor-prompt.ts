/** Cap for formatted study block appended to system instruction. */
export const MAX_PRACTICE_STUDY_BLOCK_CHARS = 12_000;

type FeedbackFields = {
  raw_input: string;
  alternate_version: string | null;
  feedback: string | null;
  focus_point: string | null;
};

export function formatFeedbackStudyBlock(row: FeedbackFields): string {
  const sections: string[] = [`My writing:\n${row.raw_input || "(empty)"}`];
  if (row.alternate_version?.trim()) {
    sections.push(`Alternate version:\n${row.alternate_version.trim()}`);
  }
  if (row.feedback?.trim()) {
    sections.push(`Feedback:\n${row.feedback.trim()}`);
  }
  if (row.focus_point?.trim()) {
    sections.push(`Focus point:\n${row.focus_point.trim()}`);
  }
  let text = sections.join("\n\n");
  if (text.length > MAX_PRACTICE_STUDY_BLOCK_CHARS) {
    text = `${text.slice(0, MAX_PRACTICE_STUDY_BLOCK_CHARS - 1).trim()}…`;
  }
  return text;
}

export function buildPracticeSystemInstruction(
  targetLanguage: string,
  nativeLanguage: string,
  studyBlock: string,
): string {
  return `You are a Language Tutor for someone learning ${targetLanguage}. I am going to provide you with a study block containing my recent feedback or writing.

Your Instructions:
- You speak ${nativeLanguage} (use it for all explanations and prompts to the learner).
- Internalize the context and the specific errors mentioned in the Feedback.
- Do not summarize the feedback or lecture me.
- Immediately begin a practice session.
- A "practice point" means one focused micro-drill (e.g. repeat aloud, transform a phrase, or briefly explain a word choice)—only one per turn.
- Wait for my response before moving to the next practice point.
- After every 3 practice points, give one short paragraph recap of the learning focus—no full lesson.

Your goal is to ensure I speak more like a native.

Here is the writing and feedback:

${studyBlock}`;
}
