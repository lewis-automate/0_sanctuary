export default function HomeLoading() {
  return (
    <div className="mx-auto w-full max-w-prose">
      <div className="space-y-6 py-8">
        <div className="h-7 w-36 animate-pulse rounded-md bg-slate-200/80" />
        <div className="h-14 animate-pulse rounded-2xl bg-slate-100/70" />
        <section className="rounded-3xl border border-slate-200 bg-white/40 p-6">
          <div className="h-3 w-14 animate-pulse rounded bg-slate-200/80" />
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <div className="h-3 w-24 animate-pulse rounded bg-slate-200/60" />
              <div className="h-8 w-20 animate-pulse rounded-md bg-slate-200/70" />
            </div>
            <div className="space-y-2">
              <div className="h-3 w-28 animate-pulse rounded bg-slate-200/60" />
              <div className="h-8 w-16 animate-pulse rounded-md bg-slate-200/70" />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
