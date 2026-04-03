import { FadeIn } from "../../_components/FadeIn";

export default function UpdatesPage() {
  return (
    <FadeIn className="mx-auto w-full max-w-prose py-8">
      <header className="mb-4">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--text-muted)]">
          Updates
        </p>
        <h1 className="mt-2 text-xl font-semibold text-[var(--foreground)]">
          Latest Updates
        </h1>
      </header>

      <section className="space-y-4 text-sm text-[var(--prose-text)]">
        <div>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>March 21st</li>
            <li>March 10th</li>
          </ul>
        </div>

      </section>
    </FadeIn>
  );
}

