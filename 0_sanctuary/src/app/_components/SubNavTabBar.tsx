"use client";

import { useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { PropsWithChildren } from "react";

/** Shared pill style for buttons inside `SubNavTabBar`. */
export function subNavTabButtonClass(isActive: boolean): string {
  return [
    "flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-full px-2 py-2 transition-colors sm:gap-2 sm:px-3",
    isActive
      ? "bg-[var(--nav-active-bg)] text-[var(--nav-active-fg)] shadow-sm"
      : "bg-[var(--surface-panel-solid)]/85 text-[var(--nav-idle-text)] shadow-sm ring-1 ring-[var(--border-default)] hover:bg-[var(--surface-elevated)] hover:text-[var(--foreground)]",
  ].join(" ");
}

/**
 * Page-level tabs fixed just above the main BottomNav (thumb-friendly).
 * Rendered via portal so `position: fixed` is viewport-relative (Ancestors
 * like Framer Motion's FadeIn use `transform`, which otherwise breaks fixed.)
 */
export function SubNavTabBar({
  ariaLabel,
  children,
}: PropsWithChildren<{ ariaLabel: string }>) {
  const [target, setTarget] = useState<HTMLElement | null>(null);

  useLayoutEffect(() => {
    setTarget(document.body);
  }, []);

  if (!target) {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-x-0 z-[45] px-2 pb-px"
      style={{ bottom: "var(--app-bottom-nav-height)" }}
    >
      <div className="mx-auto w-full max-w-md rounded-t-2xl border border-b-0 border-[var(--subnav-panel-border)] bg-[var(--subnav-panel)] px-2 pt-2.5 pb-2 shadow-[var(--subnav-shadow)] backdrop-blur-md">
        <nav
          aria-label={ariaLabel}
          className="flex items-stretch gap-1.5 sm:gap-2"
        >
          {children}
        </nav>
      </div>
    </div>,
    target,
  );
}
