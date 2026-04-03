"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase";

export function LogoutButton() {
  const router = useRouter();
  const [showConfirm, setShowConfirm] = useState(false);

  const handleLogout = async () => {
    setShowConfirm(false);
    await getSupabase().auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <>
      <button
        type="button"
        data-settings-logout
        onClick={() => setShowConfirm(true)}
        className="flex w-full items-center justify-between rounded-3xl border border-[var(--border-default)] bg-[var(--surface-panel)] px-5 py-4 text-left transition-colors hover:bg-[var(--surface-elevated)]"
      >
        <span className="text-base font-medium text-[var(--foreground)]">
          Log out
        </span>
        <span className="text-sm text-[var(--text-muted)]">›</span>
      </button>

      {showConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4"
          onClick={() => setShowConfirm(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="logout-dialog-title"
        >
          <div
            className="w-full max-w-sm rounded-3xl border border-[var(--border-default)] bg-[var(--surface-panel-solid)] p-6 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              id="logout-dialog-title"
              className="font-serif text-lg font-semibold text-[var(--foreground)]"
            >
              Log out?
            </h2>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              Are you sure you want to log out?
            </p>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                className="flex-1 rounded-2xl border border-[var(--border-default)] bg-[var(--field-bg)] py-2.5 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface-elevated)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="flex-1 rounded-2xl border border-[var(--border-strong)] bg-[var(--nav-active-bg)] py-2.5 text-sm font-medium text-[var(--nav-active-fg)] transition-colors hover:opacity-90"
              >
                Log out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
