"use client";

import { AddVocabPanel } from "./AddVocabPanel";

type Props = {
  /** `h1` on the standalone page; `h2` when nested under Vocab tabs. */
  headingLevel?: 1 | 2;
  /** Tighter spacing when shown under Study (below Rapid review). */
  embedded?: boolean;
};

export function AddVocabScreen({ headingLevel = 1, embedded = false }: Props) {
  return (
    <div
      className={
        embedded ? "space-y-6 pt-2 pb-4" : "space-y-6 py-8"
      }
    >
      <AddVocabPanel />
    </div>
  );
}
