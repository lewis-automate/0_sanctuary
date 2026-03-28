"use client";

import { AddVocabPanel } from "./AddVocabPanel";

type Props = {
  /** `h1` on the standalone page; `h2` when nested under Vocab tabs. */
  headingLevel?: 1 | 2;
};

const titleClass = "text-xl font-semibold text-slate-900";

export function AddVocabScreen({ headingLevel = 1 }: Props) {
  return (
    <div className="space-y-6 py-8">
      <header className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
        <div>
          {headingLevel === 1 ? (
            <h1 className={titleClass}>Add vocab</h1>
          ) : (
            <h2 className={titleClass}>Add vocab</h2>
          )}
          <p className="mt-1 text-sm text-slate-600">Mockup — nothing is saved yet.</p>
        </div>
      </header>

      <AddVocabPanel />
    </div>
  );
}
