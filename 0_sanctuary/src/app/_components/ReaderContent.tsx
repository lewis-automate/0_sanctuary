"use client";

import Link from "next/link";
import { useState } from "react";
import { FadeIn } from "./FadeIn";
import { InteractiveStory } from "./InteractiveStory";
import { ReaderControls, type FontSize } from "./ReaderControls";
import type { Story } from "../_data/stories";

type Props = {
  story: Story | null;
  message?: string;
};

export function ReaderContent({ story, message }: Props) {
  const [fontSize, setFontSize] = useState<FontSize>("md");

  if (!story) {
    return (
      <FadeIn className="mx-auto w-full max-w-prose text-center">
        <p className="text-slate-600">{message ?? "No story found."}</p>
        <Link
          href="/library"
          className="mt-4 inline-block text-sm font-medium text-slate-900 underline underline-offset-2"
        >
          Go to library
        </Link>
      </FadeIn>
    );
  }

  return (
    <div className="relative">
      <ReaderControls fontSize={fontSize} onFontSizeChange={setFontSize} />

      <FadeIn className="mx-auto w-full max-w-prose">
        <header className="text-center">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
            Sanctuary • {story.language} • {story.difficulty}
          </p>
          <h1 className="mt-2 font-serif text-4xl font-semibold leading-tight tracking-tight text-slate-900">
            {story.title}
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            {story.wordCount.toLocaleString()} words
          </p>
        </header>

        <InteractiveStory story={story} fontSize={fontSize} />
      </FadeIn>
    </div>
  );
}
