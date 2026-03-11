import { FadeIn } from "../../_components/FadeIn";

export default function UpdatesPage() {
  return (
    <FadeIn className="mx-auto w-full max-w-prose py-8">
      <header className="mb-4">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
          Updates
        </p>
        <h1 className="mt-2 text-xl font-semibold text-slate-900">
          What&apos;s new in Sanctuary
        </h1>
      </header>

      <section className="space-y-4 text-sm text-slate-700">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">
            Update March 10th:
          </h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>General: Slight color changes.</li>
            <li>Home page: Stats linked.</li>
            <li>Settings-page: Functional buttons only.</li>
            <li>Library page: mini-overhaul for full functionality.</li>
          </ul>
        </div>

      </section>
    </FadeIn>
  );
}

