"use client";

import Link from "next/link";
import { FreeWriterPanel } from "../_components/FreeWriterPanel";
import { FadeIn } from "../_components/FadeIn";

export default function WriterPage() {
  return (
    <FadeIn className="mx-auto w-full max-w-prose">
      <div className="space-y-6 py-8">
        <header className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
          <div>
            <Link
              href="/"
              className="text-xs font-medium text-slate-500 underline-offset-4 hover:text-slate-700 hover:underline"
            >
              ← Home
            </Link>
            <h1 className="mt-2 text-xl font-semibold text-slate-900">
              Writer
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Mockup — nothing is sent or saved yet.
            </p>
          </div>
        </header>

        <FreeWriterPanel />
      </div>
    </FadeIn>
  );
}
