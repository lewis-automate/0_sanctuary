import { Suspense } from "react";
import { FadeIn } from "../_components/FadeIn";
import { PageLoading } from "../_components/PageLoading";
import { LibraryPageContent } from "./LibraryPageContent";

export default function LibraryPage() {
  return (
    <FadeIn variant="tab" className="mx-auto w-full max-w-prose">
      <header className="mb-3 text-center sm:text-left">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--text-muted)]">
          Library
        </p>
      </header>
      <Suspense fallback={<PageLoading />}>
        <LibraryPageContent />
      </Suspense>
    </FadeIn>
  );
}
