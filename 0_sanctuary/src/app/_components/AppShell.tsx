"use client";

import { Settings } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { PropsWithChildren } from "react";
import { BottomNav } from "./BottomNav";

export function AppShell({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const hideNav =
    pathname.startsWith("/login") ||
    pathname.startsWith("/reader") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/auth/");

  const flow = pathname === "/vocab" ? searchParams.get("flow") : null;
  const immersiveVocab =
    flow === "rapid-review" ||
    flow === "hyper-focus" ||
    flow === "five-sentences";

  const chromeHidden = hideNav || immersiveVocab;

  const onMainSettingsHub = pathname === "/settings";

  const mainPadding = chromeHidden
    ? immersiveVocab
      ? "pb-6 pt-[max(1rem,env(safe-area-inset-top))]"
      : "pb-10 pt-10"
    : "pb-28 pt-10";

  return (
    <div className="min-h-dvh bg-[var(--background)] text-[var(--foreground)]">
      {!chromeHidden && !onMainSettingsHub ? (
        <Link
          href="/settings"
          className="fixed right-[max(1rem,env(safe-area-inset-right))] top-[max(1rem,env(safe-area-inset-top))] z-[60] rounded-full border border-slate-200 bg-[#fbf5ef]/90 p-2.5 text-slate-700 shadow-sm backdrop-blur transition-colors hover:border-slate-300 hover:bg-[#f5ece3]/95 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950/20"
          aria-label="Settings"
        >
          <Settings className="h-5 w-5 shrink-0" aria-hidden />
        </Link>
      ) : null}
      <main className={`mx-auto w-full max-w-md px-6 ${mainPadding}`}>
        {children}
      </main>
      {chromeHidden ? null : <BottomNav />}
    </div>
  );
}

