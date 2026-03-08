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
        onClick={() => setShowConfirm(true)}
        className="flex w-full items-center justify-between rounded-3xl border border-slate-200 bg-white/70 px-5 py-4 text-left transition-colors hover:bg-white"
      >
        <span className="text-base font-medium text-slate-900">Log out</span>
        <span className="text-sm text-slate-500">›</span>
      </button>

      {showConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4"
          onClick={() => setShowConfirm(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="logout-dialog-title"
        >
          <div
            className="w-full max-w-sm rounded-3xl border border-slate-200 bg-[#FDFCFB] p-6 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="logout-dialog-title" className="font-serif text-lg font-semibold text-slate-900">
              Log out?
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Are you sure you want to log out?
            </p>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                className="flex-1 rounded-2xl border border-slate-200 bg-white py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="flex-1 rounded-2xl bg-slate-900 py-2.5 text-sm font-medium text-[#FDFCFB] transition-colors hover:bg-slate-800"
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
