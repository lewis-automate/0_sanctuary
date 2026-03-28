"use client";

import { FadeIn } from "../_components/FadeIn";
import { AddVocabScreen } from "../vocab/AddVocabScreen";

export default function AddVocabPage() {
  return (
    <FadeIn className="mx-auto w-full max-w-prose">
      <AddVocabScreen headingLevel={1} />
    </FadeIn>
  );
}
