import { Suspense } from "react";
import { FadeIn } from "../../../_components/FadeIn";
import { PageLoading } from "../../../_components/PageLoading";
import { PracticeChatPageContent } from "./PracticeChatPageContent";

type PageProps = {
  params: Promise<{ feedbackId: string }>;
};

export default function PracticeChatPage({ params }: PageProps) {
  return (
    <FadeIn className="mx-auto flex h-[calc(100dvh-5.5rem)] min-h-0 w-full max-w-5xl flex-col">
      <Suspense
        fallback={
          <PageLoading maxWidthClass="max-w-5xl" />
        }
      >
        <PracticeChatPageContent params={params} />
      </Suspense>
    </FadeIn>
  );
}
