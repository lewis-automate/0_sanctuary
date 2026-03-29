import { Suspense } from "react";
import { FadeIn } from "../_components/FadeIn";
import { WritingTabs } from "./WritingTabs";

type PageProps = {
  searchParams?: Promise<{ tab?: string }> | { tab?: string };
};

export default async function WritingPage({ searchParams }: PageProps) {
  const params =
    searchParams instanceof Promise ? await searchParams : searchParams ?? {};
  const raw = typeof params.tab === "string" ? params.tab : "";
  const initialTab =
    raw === "writenow"
      ? ("write-now" as const)
      : raw === "thoughts"
        ? ("thoughts" as const)
        : undefined;

  return (
    <FadeIn className="mx-auto w-full max-w-prose">
      <header className="mb-3 text-center sm:text-left">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
          Writing
        </p>
      </header>
      <Suspense fallback={<div className="min-h-[40vh]" aria-hidden />}>
        <WritingTabs initialTab={initialTab} />
      </Suspense>
    </FadeIn>
  );
}
