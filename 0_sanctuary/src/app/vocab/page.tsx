import { redirect } from "next/navigation";
import { Suspense } from "react";
import { FadeIn } from "../_components/FadeIn";
import { PageLoading } from "../_components/PageLoading";
import { VocabPageContent } from "./VocabPageContent";

type PageProps = {
  searchParams?: Promise<{ tab?: string; flow?: string }> | { tab?: string; flow?: string };
};

export default function VocabPage({ searchParams }: PageProps) {
  return (
    <FadeIn variant="tab" className="mx-auto w-full max-w-prose">
      <Suspense fallback={<PageLoading />}>
        <VocabPageContent searchParams={searchParams} />
      </Suspense>
    </FadeIn>
  );
}
