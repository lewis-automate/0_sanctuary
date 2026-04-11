import { Suspense } from "react";
import { PageLoading } from "../_components/PageLoading";
import { ReaderPageContent } from "./ReaderPageContent";

type PageProps = {
  searchParams?: Promise<{ story?: string }> | { story?: string };
};

export default function ReaderPage({ searchParams }: PageProps) {
  return (
    <Suspense fallback={<PageLoading />}>
      <ReaderPageContent searchParams={searchParams} />
    </Suspense>
  );
}
