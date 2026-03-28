export type StoryGenPayload = {
  topic?: string;
  tone?: string;
  difficulty?: string;
  word_count?: string;
  /** Override profile default; omit to use settings `last_stories_filter`. */
  last_stories_filter?: number;
};

/** Same as submitting /create with every field blank (defaults from profile only). */
export const EMPTY_STORY_GEN_PAYLOAD = {} satisfies StoryGenPayload;
