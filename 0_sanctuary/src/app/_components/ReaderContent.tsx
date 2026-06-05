"use client";

import Link from "next/link";
import { useState } from "react";
import type { AppThemePreference } from "@/lib/app-theme";
import { FadeIn } from "./FadeIn";
import { InteractiveStory } from "./InteractiveStory";
import { ReaderControls, type FontSize } from "./ReaderControls";
import {
  readerThemeFabClass,
  ThemeToggleButton,
} from "./ThemeToggleButton";
import type { Story } from "../_data/stories";

type Props = {
  story: Story | null;
  message?: string;
  targetLanguage?: string;
  nativeLanguage?: string;
  appTheme?: AppThemePreference;
};

export function ReaderContent({
  story,
  message,
  targetLanguage = "",
  nativeLanguage = "",
  appTheme,
}: Props) {
  const [fontSize, setFontSize] = useState<FontSize>("md");

  if (!story) {
    return (
      <FadeIn className="relative mx-auto w-full max-w-prose text-center">
        {appTheme ? (
          <ThemeToggleButton
            initialTheme={appTheme}
            className={`${readerThemeFabClass} absolute right-0 top-0`}
          />
        ) : null}
        <p className="text-[var(--text-muted)]">
          {message ?? "No story found."}
        </p>
        <Link
          href="/library"
          className="mt-4 inline-block text-sm font-medium text-[var(--foreground)] underline underline-offset-2"
        >
          Go to library
        </Link>
      </FadeIn>
    );
  }

  return (
    <div className="relative">
      <ReaderControls fontSize={fontSize} onFontSizeChange={setFontSize} />
      {appTheme ? (
        <ThemeToggleButton
          initialTheme={appTheme}
          className={`${readerThemeFabClass} absolute right-0 top-0`}
        />
      ) : null}

      <FadeIn className="mx-auto w-full max-w-prose">
        <header className="text-center">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--text-muted)]">
            {story.language} • {story.difficulty}
          </p>
          <h1 className="mt-2 font-serif text-4xl font-semibold leading-tight tracking-tight text-[var(--foreground)]">
            {story.title}
          </h1>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            {story.wordCount.toLocaleString()} words
          </p>
        </header>

        <InteractiveStory
          story={story}
          fontSize={fontSize}
          targetLanguage={targetLanguage}
          nativeLanguage={nativeLanguage}
        />
      </FadeIn>
    </div>
  );
}
