import { Suspense } from "react";
import { FadeIn } from "./_components/FadeIn";
import { PageLoading } from "./_components/PageLoading";
import { HomePageContent } from "./HomePageContent";

type PageProps = {
  searchParams?: Promise<{ tab?: string }> | { tab?: string };
};

export default function HomePage({ searchParams }: PageProps) {
  return (
    <FadeIn className="mx-auto w-full max-w-prose">
      <Suspense fallback={<PageLoading />}>
        <HomePageContent searchParams={searchParams} />
      </Suspense>
    </FadeIn>
  );
}
