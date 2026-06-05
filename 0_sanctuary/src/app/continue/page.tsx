import { Suspense } from "react";
import { PageLoading } from "../_components/PageLoading";
import { ContinuePageContent } from "./ContinuePageContent";

export default function ContinuePage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <ContinuePageContent />
    </Suspense>
  );
}
