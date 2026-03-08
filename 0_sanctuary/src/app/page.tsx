import Link from "next/link";
import { FadeIn } from "./_components/FadeIn";

export default function HomePage() {
  return (
    <FadeIn className="mx-auto w-full max-w-prose">
      <header className="text-center">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
          Sanctuary
        </p>
      </header>

      <section className="mt-8 space-y-4">
        <div className="grid gap-2 sm:grid-cols-2">
          <Link
            href="/create"
            className="flex h-11 items-center justify-center rounded-full border border-slate-900/80 bg-slate-900 text-sm font-medium text-[#FDFCFB] shadow-sm transition-colors hover:bg-slate-800"
          >
            Write article
          </Link>
          <Link
            href="/library"
            className="flex h-11 items-center justify-center rounded-full border border-slate-900/80 bg-slate-900 text-sm font-medium text-[#FDFCFB] shadow-sm transition-colors hover:bg-slate-800"
          >
            Library
          </Link>
        </div>

        <form className="flex items-center gap-2">
          <input
            type="text"
            maxLength={50}
            placeholder="Add vocab…"
            className="flex-1 rounded-2xl border border-slate-200 bg-white/80 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-0"
          />
          <button
            type="submit"
            className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-[#FDFCFB] shadow-sm transition-colors hover:bg-slate-800"
          >
            Submit
          </button>
        </form>
      </section>

      <section className="mt-10 rounded-3xl border border-slate-200 bg-white/80 p-6">
        <h2 className="font-serif text-xl font-semibold tracking-tight text-slate-900">
          This month
        </h2>

        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-100 bg-[#FDFCFB]">
          <div className="grid grid-cols-5 border-b border-slate-100 bg-slate-50/60 px-4 py-2 text-xs font-medium uppercase tracking-wide text-slate-500">
            <span>Month</span>
            <span className="text-center">01</span>
            <span className="text-center">02</span>
            <span className="text-center">03</span>
            <span className="text-center">04</span>
          </div>
          <div className="grid grid-cols-5 px-4 py-3 text-sm text-slate-700">
            <span className="font-medium">Stories read</span>
            <span className="text-center">80</span>
            <span className="text-center">65</span>
            <span className="text-center">101</span>
            <span className="text-center">32</span>
          </div>
        </div>

        <dl className="mt-6 grid gap-4 text-sm text-slate-600 sm:grid-cols-3">
          <div>
            <dt className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
              Total words read
            </dt>
            <dd className="mt-1 text-lg font-semibold text-slate-900">
              42,380
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
              Saved vocab count
            </dt>
            <dd className="mt-1 text-lg font-semibold text-slate-900">186</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
              Average translations
            </dt>
            <dd className="mt-1 text-lg font-semibold text-slate-900">2.4</dd>
          </div>
        </dl>
      </section>
    </FadeIn>
  );
}
