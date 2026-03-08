import Link from "next/link";
import { FadeIn } from "../_components/FadeIn";
import { LogoutButton } from "../_components/LogoutButton";

const items = ["Preferences (inactive)", "Review (inactive)", "Story (inactive)", "Subscription (inactive)", "About (inactive)"] as const;

type PageProps = {
  searchParams?: Promise<{ message?: string }> | { message?: string };
};

export default async function SettingsPage({ searchParams }: PageProps) {
  const params = searchParams instanceof Promise ? await searchParams : searchParams ?? {};
  const message = params.message;

  return (
    <FadeIn className="mx-auto w-full max-w-prose">
      <header className="mb-3 text-center sm:text-left">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
          Settings
        </p>
        {message && (
          <p className="mt-2 text-sm text-slate-600">
            {decodeURIComponent(message.replace(/\+/g, " "))}
          </p>
        )}
      </header>

      <div className="mt-6 space-y-3">
        <Link
          href="/settings/password"
          className="flex w-full items-center justify-between rounded-3xl border border-slate-200 bg-white/70 px-5 py-4 text-left transition-colors hover:bg-white"
        >
          <span className="text-base font-medium text-slate-900">Password</span>
          <span className="text-sm text-slate-500">›</span>
        </Link>
        {items.map((label) => (
          <button
            key={label}
            type="button"
            className="flex w-full items-center justify-between rounded-3xl border border-slate-200 bg-white/70 px-5 py-4 text-left transition-colors hover:bg-white"
          >
            <span className="text-base font-medium text-slate-900">{label}</span>
            <span className="text-sm text-slate-500">›</span>
          </button>
        ))}
        <LogoutButton />
      </div>
    </FadeIn>
  );
}

