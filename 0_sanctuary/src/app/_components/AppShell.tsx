"use client";

import { usePathname } from "next/navigation";
import type { PropsWithChildren } from "react";
import { BottomNav } from "./BottomNav";

export function AppShell({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const hideNav = pathname.startsWith("/login") || pathname.startsWith("/reader") || pathname.startsWith("/forgot-password") || pathname.startsWith("/auth/");

  return (
    <div className="min-h-dvh bg-[var(--background)] text-[var(--foreground)]">
      <main
        className={`mx-auto w-full max-w-md px-6 pt-10 ${hideNav ? "pb-10" : "pb-28"}`}
      >
        {children}
      </main>
      <BottomNav />
    </div>
  );
}

