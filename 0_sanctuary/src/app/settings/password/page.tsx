import Link from "next/link";
import { FadeIn } from "../../_components/FadeIn";
import { UpdatePasswordForm } from "../../_components/UpdatePasswordForm";

export default function PasswordPage() {
  return (
    <FadeIn className="mx-auto w-full max-w-prose">
      <header className="mb-3 text-center sm:text-left">
        <Link
          href="/settings"
          className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500 hover:text-slate-700"
        >
          ← Back to Settings
        </Link>
        <h1 className="mt-4 font-serif text-2xl font-semibold tracking-tight text-slate-900">
          Update password
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Choose a new password (at least 6 characters).
        </p>
      </header>

      <div className="mt-6 rounded-3xl border border-slate-200 bg-white/70 p-5">
        <UpdatePasswordForm />
      </div>
    </FadeIn>
  );
}
