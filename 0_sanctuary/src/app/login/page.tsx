"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase";

const PASSWORD_MIN = 6;
const PASSWORD_MAX = 99;

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setLoading(true);
    const { error } = await getSupabase().auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setMessage({ text: error.message, error: true });
      return;
    }
    router.push("/");
    router.refresh();
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    if (password.length < PASSWORD_MIN) {
      setMessage({
        text: `Password must be at least ${PASSWORD_MIN} characters.`,
        error: true,
      });
      return;
    }
    if (password.length > PASSWORD_MAX) {
      setMessage({
        text: `Password must be at most ${PASSWORD_MAX} characters.`,
        error: true,
      });
      return;
    }
    setLoading(true);
    const { error } = await getSupabase().auth.signUp({ email, password });
    setLoading(false);
    if (error) {
      setMessage({ text: error.message, error: true });
      return;
    }
    router.push("/");
    router.refresh();
  };

  return (
    <div className="flex min-h-[calc(100dvh-5rem)] items-center justify-center px-6">
      <div className="w-full max-w-sm rounded-3xl border border-[var(--border-default)] bg-[var(--surface-panel)] p-6 shadow-sm">
        <p className="text-center text-xs font-medium uppercase tracking-[0.18em] text-[var(--text-muted)]">
          Sanctuary
        </p>
        <h1 className="mt-2 text-center font-serif text-2xl font-semibold tracking-tight text-[var(--foreground)]">
          Welcome back
        </h1>

        <form className="mt-6 space-y-4" onSubmit={handleSignIn}>
          <div>
            <label
              htmlFor="email"
              className="block text-xs font-medium uppercase tracking-[0.16em] text-[var(--text-muted)]"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="mt-2 w-full rounded-2xl border border-[var(--field-border)] bg-[var(--field-bg)] px-3 py-2.5 text-sm text-[var(--field-text)] placeholder:text-[var(--field-placeholder)] focus:border-[var(--border-strong)] focus:outline-none focus:ring-0"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label
                htmlFor="password"
                className="block text-xs font-medium uppercase tracking-[0.16em] text-[var(--text-muted)]"
              >
                Password
              </label>
              <a
                href="/forgot-password"
                className="text-xs text-[var(--text-muted)] hover:text-[var(--foreground)]"
              >
                Forgot password?
              </a>
            </div>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) =>
                setPassword(e.target.value.slice(0, PASSWORD_MAX))
              }
              required
              minLength={PASSWORD_MIN}
              maxLength={PASSWORD_MAX}
              autoComplete="current-password"
              className="mt-2 w-full rounded-2xl border border-[var(--field-border)] bg-[var(--field-bg)] px-3 py-2.5 text-sm text-[var(--field-text)] placeholder:text-[var(--field-placeholder)] focus:border-[var(--border-strong)] focus:outline-none focus:ring-0"
              placeholder="••••••••"
            />
          </div>

          {message && (
            <p
              className={`text-center text-sm ${message.error ? "text-[var(--semantic-danger-inline)]" : "text-[var(--prose-text)]"}`}
            >
              {message.text}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-2xl border border-[var(--border-strong)] bg-[var(--nav-active-bg)] py-2.5 text-sm font-medium text-[var(--nav-active-fg)] transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "…" : "Sign In"}
            </button>
            <button
              type="button"
              onClick={handleSignUp}
              disabled={loading}
              className="flex-1 rounded-2xl border border-[var(--border-default)] bg-[var(--field-bg)] py-2.5 text-sm font-medium text-[var(--field-text)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-elevated)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Sign Up
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
