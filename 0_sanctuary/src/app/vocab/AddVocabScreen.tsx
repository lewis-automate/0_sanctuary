"use client";

import { AddVocabPanel } from "./AddVocabPanel";

type Props = {
  /** `h1` on the standalone page; `h2` when nested under Vocab tabs. */
  headingLevel?: 1 | 2;
};

const titleClass = "text-xl font-semibold text-[var(--foreground)]";

export function AddVocabScreen({ headingLevel = 1 }: Props) {
  return (
    <div className="space-y-6 py-8">
      <AddVocabPanel />
    </div>
  );
}
