"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";

/**
 * Handles the redirect from Supabase after the user clicks the password-reset
 * link in their email. The URL contains tokens in the hash (e.g. #access_token=...&refresh_token=...&type=recovery).
 * We set the session from the hash, then redirect to the password update page.
 */
export default function AuthCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");

  useEffect(() => {
    const run = async () => {
      const hash = typeof window !== "undefined" ? window.location.hash : "";
      const params = new URLSearchParams(hash.replace(/^#/, ""));
      const access_token = params.get("access_token");
      const refresh_token = params.get("refresh_token");
      const type = params.get("type");

      if (type === "recovery" && access_token && refresh_token) {
        const { error } = await getSupabase().auth.setSession({
          access_token,
          refresh_token,
        });
        if (error) {
          setStatus("error");
          return;
        }
        setStatus("ok");
        router.replace("/settings/password");
        router.refresh();
        return;
      }

      // No recovery tokens: maybe already have a session (e.g. opened link twice)
      const { data: { session } } = await getSupabase().auth.getSession();
      if (session) {
        router.replace("/settings/password");
        router.refresh();
        return;
      }

      setStatus("error");
    };

    run();
  }, [router]);

  if (status === "error") {
    return (
      <div className="flex min-h-[calc(100dvh-5rem)] flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-slate-600">Invalid or expired reset link.</p>
        <a
          href="/forgot-password"
          className="text-sm font-medium text-slate-900 underline underline-offset-2"
        >
          Request a new link
        </a>
        <a href="/login" className="text-sm text-slate-500 hover:text-slate-700">
          Back to sign in
        </a>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100dvh-5rem)] items-center justify-center px-6">
      <p className="text-sm text-slate-500">Setting up…</p>
    </div>
  );
}
