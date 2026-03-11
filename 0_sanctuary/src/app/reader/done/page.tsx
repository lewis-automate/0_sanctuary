import Link from "next/link";
import { FadeIn } from "../../_components/FadeIn";

export default function ReaderDonePage() {
  return (
    <FadeIn className="mx-auto w-full max-w-prose">
      <div className="space-y-6 py-10 text-center">
        <div className="space-y-2">
          <p className="text-sm text-slate-600">
            Keep the momentum going by reading another story or creating something new.
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
            href="/create"
            className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-sm font-semibold text-slate-900 shadow-sm transition-colors hover:bg-white"
          >
            Create
          </Link>
        </div>
      </div>
    </FadeIn>
  );
}

