import { FadeIn } from "../_components/FadeIn";
import { WritingTabs } from "./WritingTabs";

export default function WritingPage() {
  return (
    <FadeIn className="mx-auto w-full max-w-prose">
      <header className="mb-3 text-center sm:text-left">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
          Writing
        </p>
      </header>
      <WritingTabs />
    </FadeIn>
  );
}
