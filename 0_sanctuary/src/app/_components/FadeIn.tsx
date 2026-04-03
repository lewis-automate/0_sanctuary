"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { PropsWithChildren } from "react";

/**
 * After Effects–style: steep “shoot” off the first keyframe (high y1), then a long,
 * slow ease into the hold (low x2). Reads like expo / strong ease-out, ~1s total.
 */
const SHOOT_SETTLE: [number, number, number, number] = [0.05, 0.94, 0.17, 1];

const ENTER_DURATION = 1.05;

/** Extra travel so the slow tail of the curve is visible. */
const ENTER_Y = 26;

export function FadeIn({
  children,
  className,
}: PropsWithChildren<{ className?: string }>) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={
        shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: ENTER_Y }
      }
      animate={
        shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }
      }
      transition={
        shouldReduceMotion
          ? { duration: 0.35, ease: "easeOut" }
          : {
              duration: ENTER_DURATION,
              ease: SHOOT_SETTLE,
            }
      }
    >
      {children}
    </motion.div>
  );
}
