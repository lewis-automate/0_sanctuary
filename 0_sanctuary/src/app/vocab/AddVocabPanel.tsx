"use client";

import { useId, useState } from "react";

export function AddVocabPanel() {
  const titleId = useId();
  const [rows, setRows] = useState<string[]>([""]);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);

  const nonEmptyWords = rows.map((s) => s.trim()).filter(Boolean);
  const wordLabel =
    nonEmptyWords.length === 0
      ? "No words typed yet."
      : nonEmptyWords.length === 1
        ? `1 word: “${nonEmptyWords[0]}”`
        : `${nonEmptyWords.length} words`;

  function addRow() {
    setRows((r) => [...r, ""]);
  }

  function updateRow(index: number, value: string) {
    setRows((r) => r.map((v, i) => (i === index ? value : v)));
  }

  function confirmSaveMock() {
    setSaveDialogOpen(false);
  }

  const inputClass =
    "w-full rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-950/10";

  const btnSecondary =
    "rounded-2xl border border-slate-200 bg-white/80 px-4 py-2.5 text-sm font-medium text-slate-800 transition-colors hover:bg-white";

  const btnPrimary =
    "rounded-2xl border border-slate-950 bg-slate-950 px-4 py-2.5 text-sm font-medium text-[#FDFCFB] transition-colors hover:bg-slate-800";

  return (
    <>
      <section className="rounded-3xl border border-slate-200 bg-white/80 p-5 sm:p-6">
        <div className="space-y-3">
          {rows.map((value, index) => (
            <div key={index}>
              <label className="sr-only" htmlFor={`vocab-${index}`}>
                Word or phrase {index + 1}
              </label>
              <input
                id={`vocab-${index}`}
                type="text"
                value={value}
                onChange={(e) => updateRow(index, e.target.value)}
                placeholder="Word or phrase"
                className={inputClass}
                autoComplete="off"
              />
            </div>
          ))}
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={addRow}
            className={`${btnSecondary} inline-flex h-10 min-w-10 items-center justify-center px-3 font-semibold`}
            aria-label="Add another field"
          >
            +
          </button>
          <button type="button" onClick={() => setSaveDialogOpen(true)} className={btnPrimary}>
            Save
          </button>
        </div>
      </section>

      {saveDialogOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="presentation"
        >
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/40"
            aria-label="Close dialog"
            onClick={() => setSaveDialogOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="relative z-10 w-full max-w-md rounded-3xl border border-slate-200 bg-[#FDFCFB] p-6 shadow-lg"
          >
            <h2 id={titleId} className="text-base font-semibold text-slate-900">
              Save these words?
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              Do you want to save the words you&apos;ve written? {wordLabel}
            </p>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                className={btnSecondary}
                onClick={() => setSaveDialogOpen(false)}
              >
                Cancel
              </button>
              <button type="button" className={btnPrimary} onClick={confirmSaveMock}>
                Save words
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
