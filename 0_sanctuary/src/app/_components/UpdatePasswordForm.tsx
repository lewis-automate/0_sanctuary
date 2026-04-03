"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase";

export function UpdatePasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);

  const updatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (password.length < 6) {
      setMessage({ text: "Password must be at least 6 characters.", error: true });
      return;
    }
    if (password !== confirmPassword) {
      setMessage({ text: "Passwords do not match.", error: true });
      return;
    }

    setLoading(true);
    const { error } = await getSupabase().auth.updateUser({ password });

    setLoading(false);
    if (error) {
      setMessage({ text: error.message, error: true });
      return;
    }

    router.push(
      "/settings?tab=password&message=Password+updated+successfully",
    );
    router.refresh();
  };

  return (
    <form onSubmit={updatePassword} className="space-y-4">
      <div>
        <label
          htmlFor="password"
          className="block text-xs font-medium uppercase tracking-[0.16em] text-[var(--text-muted)]"
        >
          New password
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          autoComplete="new-password"
          className="mt-2 w-full rounded-2xl border border-[var(--field-border)] bg-[var(--field-bg)] px-3 py-2.5 text-sm text-[var(--field-text)] placeholder:text-[var(--field-placeholder)] focus:border-[var(--border-strong)] focus:outline-none focus:ring-0"
          placeholder="••••••••"
        />
      </div>
      <div>
        <label
          htmlFor="confirmPassword"
          className="block text-xs font-medium uppercase tracking-[0.16em] text-[var(--text-muted)]"
        >
          Confirm new password
        </label>
        <input
          id="confirmPassword"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          minLength={6}
          autoComplete="new-password"
          className="mt-2 w-full rounded-2xl border border-[var(--field-border)] bg-[var(--field-bg)] px-3 py-2.5 text-sm text-[var(--field-text)] placeholder:text-[var(--field-placeholder)] focus:border-[var(--border-strong)] focus:outline-none focus:ring-0"
          placeholder="••••••••"
        />
      </div>
      {message && (
        <p
          className={`text-sm ${message.error ? "text-[var(--semantic-danger-inline)]" : "text-[var(--prose-text)]"}`}
        >
          {message.text}
        </p>
      )}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-2xl border border-[var(--border-strong)] bg-[var(--nav-active-bg)] py-2.5 text-sm font-medium text-[var(--nav-active-fg)] transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? "Updating…" : "Update password"}
      </button>
    </form>
  );
}
