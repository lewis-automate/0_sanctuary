"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Type } from "lucide-react";

export type FontSize = "sm" | "md" | "lg";

const SIZES: { id: FontSize; label: string }[] = [
  { id: "sm", label: "S" },
  { id: "md", label: "M" },
  { id: "lg", label: "L" },
];

type Props = {
  fontSize: FontSize;
  onFontSizeChange: (size: FontSize) => void;
};

export function ReaderControls({ fontSize, onFontSizeChange }: Props) {
  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div className="absolute left-0 top-0 flex flex-col gap-2">
      <button
        type="button"
        onClick={() => setConfirmOpen(true)}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200/80 bg-white/90 shadow-sm transition-colors duration-200 hover:border-slate-300 hover:bg-white"
        aria-label="Go back"
      >
        <ArrowLeft className="h-4 w-4 text-slate-700" />
      </button>

      <div ref={ref} className="relative">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200/80 bg-white/90 shadow-sm transition-colors duration-200 hover:border-slate-300 hover:bg-white"
          aria-label="Font size"
          aria-expanded={open}
        >
          <Type className="h-4 w-4 text-slate-700" />
        </button>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.96 }}
              transition={{ duration: 0.15 }}
              className="absolute left-0 top-full z-50 mt-2 flex flex-col gap-0.5 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-lg"
            >
              {SIZES.map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    onFontSizeChange(id);
                    setOpen(false);
                  }}
                  className={`rounded-xl px-3 py-2 text-left text-sm transition-colors ${
                    fontSize === id
                      ? "bg-slate-900 text-[#FDFCFB]"
                      : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  {label}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {confirmOpen && (
          <motion.div
            key="confirm-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6"
          >
            <div
              className="absolute inset-0 bg-black/20 backdrop-blur-[2px]"
              onClick={() => setConfirmOpen(false)}
              aria-hidden="true"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.15 }}
              className="relative"
            >
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="confirm-title"
                className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-6 shadow-xl"
              >
                <p
                  id="confirm-title"
                  className="text-center text-sm text-slate-700"
                >
                  Are you sure you want to return? Progress will be lost.
                </p>
                <div className="mt-6 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setConfirmOpen(false)}
                    className="flex-1 rounded-2xl border border-slate-200 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                  >
                    Stay
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmOpen(false);
                      router.back();
                    }}
                    className="flex-1 rounded-2xl bg-slate-900 py-2.5 text-sm font-medium text-[#FDFCFB] transition-colors hover:bg-slate-800"
                  >
                    Go back
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
