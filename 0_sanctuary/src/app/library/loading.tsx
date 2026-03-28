export default function LibraryLoading() {
  return (
    <div className="mx-auto w-full max-w-prose">
      <header className="mb-3 text-center sm:text-left">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
          Library
        </p>
      </header>
      <div className="mt-5 flex flex-wrap gap-2">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-10 w-28 animate-pulse rounded-full bg-slate-200/70"
            aria-hidden
          />
        ))}
      </div>
      <div className="mt-6 space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="animate-pulse rounded-3xl border border-slate-200 bg-white/70 p-5"
          >
            <div className="h-5 w-3/4 max-w-sm rounded bg-slate-200/80" />
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
              <div className="h-4 w-28 rounded bg-slate-100/90" />
              <div className="h-4 w-24 rounded bg-slate-100/90" />
              <div className="h-4 w-20 rounded bg-slate-100/90" />
            </div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2">
              <div className="h-4 w-24 rounded bg-slate-100/90" />
              <div className="h-4 w-32 rounded bg-slate-100/90" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
