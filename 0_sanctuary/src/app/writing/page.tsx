import { Suspense } from "react";
import { FadeIn } from "../_components/FadeIn";
import { PageLoading } from "../_components/PageLoading";
import { WritingPageContent } from "./WritingPageContent";

type PageProps = {
  searchParams?: Promise<{ tab?: string }> | { tab?: string };
};

export default function WritingPage({ searchParams }: PageProps) {
  return (
    <FadeIn variant="tab" className="mx-auto w-full max-w-prose">
      <header className="mb-3 text-center sm:text-left">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--text-muted)]">
          Writing
        </p>
      </header>
      <Suspense fallback={<PageLoading />}>
        <WritingPageContent searchParams={searchParams} />
      </Suspense>
    </FadeIn>
  );
}
