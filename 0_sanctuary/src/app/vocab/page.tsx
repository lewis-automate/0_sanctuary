import { redirect } from "next/navigation";
import { Suspense } from "react";
import { FadeIn } from "../_components/FadeIn";
import { PageLoading } from "../_components/PageLoading";
import { VocabReview } from "./vocab-review";

const VALID_TABS = new Set(["saved", "quick-review"]);

type PageProps = {
  searchParams?: Promise<{ tab?: string }> | { tab?: string };
};

export default async function VocabPage({ searchParams }: PageProps) {
  const params = searchParams instanceof Promise ? await searchParams : searchParams ?? {};
  const raw = typeof params.tab === "string" ? params.tab : "";
  if (raw === "add") {
    redirect("/vocab?tab=quick-review");
  }
  const initialTab = VALID_TABS.has(raw)
    ? (raw as "saved" | "quick-review")
    : undefined;

  return (
    <FadeIn className="mx-auto w-full max-w-prose">
      <Suspense fallback={<PageLoading />}>
        <VocabReview initialTab={initialTab} />
      </Suspense>
    </FadeIn>
  );
}
