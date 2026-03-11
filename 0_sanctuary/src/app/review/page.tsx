import { VocabReview } from "./vocab-review";
import { FadeIn } from "../_components/FadeIn";

export default function ReviewPage() {
  return (
    <FadeIn className="mx-auto w-full max-w-prose">
      <VocabReview />
    </FadeIn>
  );
}
