import { Suspense } from "react";
import { FadeIn } from "../_components/FadeIn";
import { VocabReview } from "./vocab-review";

const VALID_TABS = new Set(["add", "saved", "quick-review"]);

type PageProps = {
  searchParams?: Promise<{ tab?: string }> | { tab?: string };
};

export default async function VocabPage({ searchParams }: PageProps) {
  const params = searchParams instanceof Promise ? await searchParams : searchParams ?? {};
  const raw = typeof params.tab === "string" ? params.tab : "";
  const initialTab = VALID_TABS.has(raw) ? (raw as "add" | "saved" | "quick-review") : undefined;

  return (
    <FadeIn className="mx-auto w-full max-w-prose">
      <Suspense fallback={<div className="min-h-[50vh]" aria-hidden />}>
        <VocabReview initialTab={initialTab} />
      </Suspense>
    </FadeIn>
  );
}
