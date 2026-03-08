"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FilePenLine, Home, LibraryBig, NotebookPen, Settings } from "lucide-react";

type Tab = {
  href: string;
  label: "Create" | "Library" | "Home" | "Review" | "Settings";
  Icon: typeof LibraryBig;
};

const tabs: Tab[] = [
  { href: "/create", label: "Create", Icon: FilePenLine },
  { href: "/library", label: "Library", Icon: LibraryBig },
  { href: "/", label: "Home", Icon: Home },
  { href: "/review", label: "Review", Icon: NotebookPen },
  { href: "/settings", label: "Settings", Icon: Settings },
];

export function BottomNav() {
  const pathname = usePathname();
  if (pathname.startsWith("/login") || pathname.startsWith("/reader") || pathname.startsWith("/forgot-password") || pathname.startsWith("/auth/")) return null;

  return (
    <nav
      aria-label="Bottom navigation"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-[#FDFCFB]/90 backdrop-blur"
    >
      <div className="mx-auto flex w-full max-w-md items-center justify-between px-4 py-3">
        {tabs.map(({ href, label, Icon }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              aria-current={isActive ? "page" : undefined}
              className={[
                "group flex w-24 flex-col items-center justify-center gap-1 rounded-2xl px-3 py-2 transition-colors",
                isActive
                  ? "bg-slate-900 text-[#FDFCFB]"
                  : "text-slate-700 hover:bg-slate-900/5 hover:text-slate-900",
              ].join(" ")}
            >
              <Icon
                className={[
                  "h-5 w-5",
                  isActive
                    ? "text-[#FDFCFB]"
                    : "text-slate-700 group-hover:text-slate-900",
                ].join(" ")}
              />
              <span className="text-xs font-medium tracking-wide">
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

