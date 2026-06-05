"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";

const EASE_SOFT = [0.83, 0, 0.17, 1] as const;
/** Skip overlay on fast navigations (e.g. prefetched tab switches). */
const OVERLAY_DELAY_MS = 150;

/** Fired when in-app navigation was cancelled (e.g. Stay on unsaved settings) so the loading blur clears. */
export const CANCEL_PENDING_NAVIGATION_EVENT = "sanctuary:cancel-pending-navigation";

export function cancelPendingNavigation() {
  window.dispatchEvent(new CustomEvent(CANCEL_PENDING_NAVIGATION_EVENT));
}

function NavigationLoadingOverlayInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchKey = searchParams.toString();
  const [pending, setPending] = useState(false);
  const reduceMotion = useReducedMotion();
  const showTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearShowTimer = () => {
    if (showTimerRef.current) {
      clearTimeout(showTimerRef.current);
      showTimerRef.current = null;
    }
  };

  const schedulePending = () => {
    clearShowTimer();
    showTimerRef.current = setTimeout(() => {
      showTimerRef.current = null;
      setPending(true);
    }, OVERLAY_DELAY_MS);
  };

  useEffect(() => {
    clearShowTimer();
    setPending(false);
  }, [pathname, searchKey]);

  useEffect(() => () => clearShowTimer(), []);

  useEffect(() => {
    const onCancelPending = () => setPending(false);
    window.addEventListener(CANCEL_PENDING_NAVIGATION_EVENT, onCancelPending);
    return () =>
      window.removeEventListener(CANCEL_PENDING_NAVIGATION_EVENT, onCancelPending);
  }, []);

  useEffect(() => {
    const shouldIgnoreClick = (a: HTMLAnchorElement) => {
      if (a.getAttribute("data-no-nav-transition") != null) return true;
      if (a.getAttribute("target") === "_blank") return true;
      if (a.hasAttribute("download")) return true;
      const rel = a.getAttribute("rel") ?? "";
      if (/\bexternal\b/i.test(rel)) return true;
      return false;
    };

    const onClickCapture = (e: MouseEvent) => {
      if (e.defaultPrevented) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (e.button !== 0) return;
      const el = e.target as HTMLElement | null;
      const a = el?.closest("a[href]");
      if (!a || !(a instanceof HTMLAnchorElement)) return;
      if (shouldIgnoreClick(a)) return;
      const href = a.getAttribute("href");
      if (!href || href.startsWith("#")) return;
      let url: URL;
      try {
        url = new URL(href, window.location.origin);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
      if (
        url.pathname === window.location.pathname &&
        url.search === window.location.search
      ) {
        return;
      }
      schedulePending();
    };

    const onPopState = () => {
      clearShowTimer();
      // Back/forward must not show the overlay. On mobile, Next.js often commits
      // the destination route before popstate; setting pending here leaves blur stuck
      // because pathname will not change again.
      setPending(false);
    };

    document.addEventListener("click", onClickCapture, true);
    window.addEventListener("popstate", onPopState);
    return () => {
      document.removeEventListener("click", onClickCapture, true);
      window.removeEventListener("popstate", onPopState);
    };
  }, []);

  const enterMs = reduceMotion ? 0.14 : 0.4;
  const exitMs = reduceMotion ? 0.12 : 0.52;

  return (
    <AnimatePresence>
      {pending ? (
        <motion.div
          key="nav-loading"
          initial={
            reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 1.014 }
          }
          animate={{ opacity: 1, scale: 1 }}
          exit={{
            opacity: 0,
            scale: 1.004,
            transition: { duration: exitMs, ease: EASE_SOFT },
          }}
          transition={{ duration: enterMs, ease: EASE_SOFT }}
          className="pointer-events-none fixed inset-0 z-[45] will-change-transform"
          aria-hidden
        >
          <div className="absolute inset-0 bg-[var(--background)]/48 backdrop-blur-[2px] dark:bg-[var(--background)]/42 sm:backdrop-blur-[6px]" />

          <div
            className="absolute inset-0 opacity-70 dark:opacity-80"
            style={{
              background:
                "radial-gradient(120% 80% at 50% -10%, var(--foreground) / 0.06, transparent 55%), radial-gradient(90% 60% at 50% 100%, var(--foreground) / 0.05, transparent 50%)",
            }}
          />

          {!reduceMotion ? (
            <motion.div
              className="absolute inset-x-0 top-0 h-[2px] overflow-hidden bg-gradient-to-r from-transparent via-[var(--border-strong)]/30 to-transparent"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.04, duration: 0.32, ease: EASE_SOFT }}
            >
              <motion.div
                className="h-full w-[38%] rounded-full bg-gradient-to-r from-[var(--nav-active-bg)]/0 via-[var(--nav-active-bg)]/30 to-[var(--nav-active-bg)]/0"
                initial={{ x: "-100%" }}
                animate={{ x: "320%" }}
                transition={{
                  duration: 1.2,
                  repeat: Infinity,
                  ease: "linear",
                }}
              />
            </motion.div>
          ) : null}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export function NavigationLoadingOverlay() {
  return (
    <Suspense fallback={null}>
      <NavigationLoadingOverlayInner />
    </Suspense>
  );
}
