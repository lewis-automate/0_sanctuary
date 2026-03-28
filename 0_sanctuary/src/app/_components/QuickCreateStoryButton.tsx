"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { queueStoryGeneration } from "../create/actions";
import { EMPTY_STORY_GEN_PAYLOAD } from "../create/story-gen-payload";

type Props = {
  className: string;
  titleClassName: string;
  subClassName: string;
};

export function QuickCreateStoryButton({
  className,
  titleClassName,
  subClassName,
}: Props) {
  const dialogTitleId = useId();
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const btnSecondary =
    "rounded-2xl border border-slate-200 bg-white/80 px-4 py-2.5 text-sm font-medium text-slate-800 transition-colors hover:bg-white";

  const btnPrimary =
    "rounded-2xl border border-slate-950 bg-slate-950 px-4 py-2.5 text-sm font-medium text-[#FDFCFB] transition-colors hover:bg-slate-800";

  async function runQuickCreate() {
    setError(null);
    setDialogOpen(false);
    setPending(true);
    const result = await queueStoryGeneration(EMPTY_STORY_GEN_PAYLOAD);
    setPending(false);
    if (result.ok) {
      router.refresh();
    } else {
      setError(result.error);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-1">
      <button
        type="button"
        className={`${className} h-full min-h-0`}
        onClick={() => setDialogOpen(true)}
        disabled={pending}
        aria-busy={pending}
      >
        <span className={titleClassName}>Quick create</span>
        <span className={subClassName}>
          {pending
            ? "Queuing…"
            : "Generate a passage using your current settings"}
        </span>
      </button>
      {error ? (
        <p className="px-1 text-xs text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      {dialogOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="presentation"
        >
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/40"
            aria-label="Close dialog"
            onClick={() => setDialogOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={dialogTitleId}
            className="relative z-10 w-full max-w-md rounded-3xl border border-slate-200 bg-[#FDFCFB] p-6 shadow-lg"
          >
            <h2
              id={dialogTitleId}
              className="text-base font-semibold text-slate-900"
            >
              Create?
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              This uses your current profile settings to generate new reading material.
            </p>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                className={btnSecondary}
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </button>
              <button type="button" className={btnPrimary} onClick={runQuickCreate}>
                Create
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
