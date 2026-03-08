"use client";

import Link from "next/link";
import { useState } from "react";
import { getSupabase } from "@/lib/supabase";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setLoading(true);
    const redirectTo =
      typeof window !== "undefined"
        ? `${window.location.origin}/auth/callback`
        : "";
    const { error } = await getSupabase().auth.resetPasswordForEmail(email, {
      redirectTo,
    });
    setLoading(false);
    if (error) {
      setMessage({ text: error.message, error: true });
      return;
    }
    setSent(true);
  };

  if (sent) {
    return (
      <div className="flex min-h-[calc(100dvh-5rem)] items-center justify-center px-6">
        <div className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-sm text-center">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
            Check your email
          </p>
          <p className="mt-4 text-sm text-slate-700">
            If an account exists for <strong>{email}</strong>, we’ve sent a link to reset your password.
          </p>
          <Link
            href="/login"
            className="mt-6 inline-block text-sm font-medium text-slate-900 underline underline-offset-2"
          >
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100dvh-5rem)] items-center justify-center px-6">
      <div className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-sm">
        <p className="text-center text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
          Sanctuary
        </p>
        <h1 className="mt-2 text-center font-serif text-2xl font-semibold tracking-tight text-slate-900">
          Reset password
        </h1>
        <p className="mt-2 text-center text-sm text-slate-600">
          Enter your email and we’ll send you a link to set a new password.
        </p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label
              htmlFor="email"
              className="block text-xs font-medium uppercase tracking-[0.16em] text-slate-500"
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
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-0"
              placeholder="you@example.com"
            />
          </div>
          {message && (
            <p className={`text-sm ${message.error ? "text-red-600" : "text-slate-600"}`}>
              {message.text}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-slate-900 py-2.5 text-sm font-medium text-[#FDFCFB] transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Sending…" : "Send reset link"}
          </button>
        </form>

        <p className="mt-4 text-center">
          <Link href="/login" className="text-sm text-slate-500 hover:text-slate-700">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
