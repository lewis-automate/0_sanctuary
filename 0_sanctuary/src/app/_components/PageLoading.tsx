type PageLoadingProps = {
  /** Default matches most app routes (`max-w-prose`). Settings uses `max-w-3xl`. */
  maxWidthClass?: string;
};

export function PageLoading({ maxWidthClass = "max-w-prose" }: PageLoadingProps) {
  return (
    <div
      className={`mx-auto w-full ${maxWidthClass} animate-pulse space-y-4 py-2`}
      aria-busy
      aria-label="Loading"
    >
      <div className="h-3 w-28 rounded bg-[var(--border-default)]" />
      <div className="h-36 rounded-3xl bg-[var(--border-default)]/55" />
      <div className="h-36 rounded-3xl bg-[var(--border-default)]/55" />
      <div className="h-10 w-full rounded-2xl bg-[var(--border-default)]/40" />
    </div>
  );
}
