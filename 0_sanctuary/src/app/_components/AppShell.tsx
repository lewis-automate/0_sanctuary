"use client";

import { Settings } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { PropsWithChildren } from "react";
import { Suspense } from "react";
import { BottomNav } from "./BottomNav";

type ShellInnerProps = PropsWithChildren<{
  immersiveVocab: boolean;
}>;

function AppShellInner({ children, immersiveVocab }: ShellInnerProps) {
  const pathname = usePathname();

  const hideNav =
    pathname.startsWith("/login") ||
    pathname.startsWith("/reader") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/auth/");

  const chromeHidden = hideNav || immersiveVocab;

  const onMainSettingsHub = pathname === "/settings";

  const hasBottomTabStack =
    !chromeHidden &&
    (pathname === "/" ||
      pathname === "/writing" ||
      (pathname === "/vocab" && !immersiveVocab));

  const mainPadding = chromeHidden
    ? immersiveVocab
      ? "pb-6 pt-[max(1rem,env(safe-area-inset-top))]"
      : "pb-10 pt-10"
    : hasBottomTabStack
      ? "pb-40 pt-10"
      : "pb-28 pt-10";

  return (
    <div className="min-h-dvh bg-[var(--background)] text-[var(--foreground)]">
      {!chromeHidden && !onMainSettingsHub ? (
        <Link
          href="/settings"
          className="fixed right-[max(1rem,env(safe-area-inset-right))] top-[max(1rem,env(safe-area-inset-top))] z-[60] rounded-full border border-[var(--border-default)] bg-[var(--chrome-fab-bg)] p-2.5 text-[var(--nav-idle-text)] shadow-sm backdrop-blur transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--chrome-fab-hover)] hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--foreground)]/20"
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

/** `useSearchParams` must sit under `Suspense`; keep the boundary tight so route transitions don’t swap the whole chrome. */
function VocabImmersiveShell({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const flow = pathname === "/vocab" ? searchParams.get("flow") : null;
  const immersiveVocab = flow === "rapid-review";
  return (
    <AppShellInner immersiveVocab={immersiveVocab}>{children}</AppShellInner>
  );
}

export function AppShell({ children }: PropsWithChildren) {
  return (
    <Suspense
      fallback={<AppShellInner immersiveVocab={false}>{children}</AppShellInner>}
    >
      <VocabImmersiveShell>{children}</VocabImmersiveShell>
    </Suspense>
  );
}
