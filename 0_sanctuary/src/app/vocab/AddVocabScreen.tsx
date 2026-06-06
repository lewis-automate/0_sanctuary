"use client";

import { AddVocabPanel } from "./AddVocabPanel";

type Props = {
  /** `h1` on the standalone page; `h2` when nested under another heading. */
  headingLevel?: 1 | 2;
  /** Tighter spacing when embedded in another section. */
  embedded?: boolean;
  onWordsSaved?: () => void;
};

export function AddVocabScreen({
  headingLevel = 1,
  embedded = false,
  onWordsSaved,
}: Props) {
  void headingLevel;
  return (
    <div className={embedded ? "space-y-0" : "space-y-6 py-8"}>
      <AddVocabPanel onWordsSaved={onWordsSaved} />
    </div>
  );
}
