import { Suspense } from "react";
import { FadeIn } from "../_components/FadeIn";
import { PageLoading } from "../_components/PageLoading";
import { SettingsPageContent } from "./SettingsPageContent";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?:
    | Promise<{ message?: string; tab?: string }>
    | { message?: string; tab?: string };
};

export default function SettingsPage({ searchParams }: PageProps) {
  return (
    <FadeIn className="mx-auto w-full max-w-3xl">
      <Suspense fallback={<PageLoading maxWidthClass="max-w-3xl" />}>
        <SettingsPageContent searchParams={searchParams} />
      </Suspense>
    </FadeIn>
  );
}
