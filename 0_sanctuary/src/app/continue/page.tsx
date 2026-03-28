import Link from "next/link";
import { QuickCreateStoryButton } from "../_components/QuickCreateStoryButton";
import { FadeIn } from "../_components/FadeIn";

const quickActionBtn =
  "w-full rounded-2xl border border-slate-200 bg-[#fbf5ef]/90 px-4 py-3.5 text-center shadow-sm transition-colors hover:border-slate-300 hover:bg-[#f5ece3]/95 active:bg-[#efe4d8]";

const quickActionTitle = "block text-center text-sm font-medium text-slate-900";
const quickActionSub =
  "mt-1 block text-center text-xs font-normal leading-snug text-slate-500";

export default function ContinuePage() {
  return (
    <FadeIn className="mx-auto w-full max-w-prose">
      <div className="space-y-6 py-10 text-center">
        <div className="space-y-2">
          <p className="text-2xl font-semibold text-slate-900 sm:text-3xl">
            Good Job!
          </p>
          <p className="text-base leading-relaxed text-slate-600">
            Keep the momentum going~
          </p>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Link
            href="/library"
            className="inline-flex items-center justify-center rounded-2xl border border-slate-900/80 bg-slate-950 px-4 py-3 text-sm font-semibold text-[#FDFCFB] shadow-sm transition-colors hover:bg-slate-900"
          >
            Read more
          </Link>
          <Link
            href="/vocab?tab=quick-review"
            className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-sm font-semibold text-slate-900 shadow-sm transition-colors hover:bg-white"
          >
            Vocab Review
          </Link>
          <Link
            href="/writing"
            className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-sm font-semibold text-slate-900 shadow-sm transition-colors hover:bg-white sm:col-span-2"
          >
            Writing practice
          </Link>
        </div>

        <div className="pt-2 text-center">
          <QuickCreateStoryButton
            className={quickActionBtn}
            titleClassName={quickActionTitle}
            subClassName={quickActionSub}
          />
        </div>
      </div>
    </FadeIn>
  );
}
