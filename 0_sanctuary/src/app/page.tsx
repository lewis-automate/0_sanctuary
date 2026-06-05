import { Suspense } from "react";
import { FadeIn } from "./_components/FadeIn";
import { PageLoading } from "./_components/PageLoading";
import { HomePageContent } from "./HomePageContent";

type PageProps = {
  searchParams?: Promise<{ tab?: string }> | { tab?: string };
};

export default function HomePage({ searchParams }: PageProps) {
  return (
    <FadeIn variant="tab" className="mx-auto w-full max-w-prose">
      <header className="mb-3 text-center sm:text-left">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--text-muted)]">
          Home
        </p>
      </header>
      <Suspense fallback={<PageLoading />}>
        <HomePageContent searchParams={searchParams} />
      </Suspense>
    </FadeIn>
  );
}
