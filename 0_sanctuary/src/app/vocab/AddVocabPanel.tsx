"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { queueAddVocabSubmit } from "./actions";

const MAX_VOCAB_ROWS = 10;
const MAX_CHARS_PER_FIELD = 200;
/** Cap auto-grown height; textarea scrolls inside after this. */
const TEXTAREA_MAX_HEIGHT_PX = 280;

type VocabRow = { id: string; value: string };

function VocabLineField({
  value,
  onChange,
  onRemove,
  lineIdPrefix,
  lineIndex,
}: {
  value: string;
  onChange: (v: string) => void;
  onRemove?: () => void;
  lineIdPrefix: string;
  lineIndex: number;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, TEXTAREA_MAX_HEIGHT_PX)}px`;
  }, [value]);

  const lineId = `${lineIdPrefix}-line-${lineIndex}`;
  const counterId = `${lineIdPrefix}-cnt-${lineIndex}`;

  return (
    <div
      className={[
        "flex min-h-[2.75rem] items-stretch overflow-hidden rounded-2xl border border-[var(--field-border)] bg-[var(--field-bg)] shadow-sm",
        "focus-within:border-[var(--border-strong)] focus-within:ring-2 focus-within:ring-[var(--foreground)]/10",
      ].join(" ")}
    >
      <div className="relative min-w-0 flex-1">
        <label className="sr-only" htmlFor={lineId}>
          Word or phrase {lineIndex + 1}
        </label>
        <textarea
          ref={ref}
          id={lineId}
          value={value}
          onChange={(e) =>
            onChange(e.target.value.slice(0, MAX_CHARS_PER_FIELD))
          }
          placeholder="Word or phrase"
          rows={1}
          maxLength={MAX_CHARS_PER_FIELD}
          aria-describedby={counterId}
          className="w-full min-h-[2.75rem] resize-none overflow-y-auto rounded-none border-0 bg-transparent px-4 py-3 pb-9 pr-12 text-sm leading-relaxed text-[var(--field-text)] shadow-none placeholder:text-[var(--field-placeholder)] focus:outline-none focus:ring-0"
          autoComplete="off"
        />
        <span
          id={counterId}
          className="pointer-events-none absolute bottom-2 right-3 text-xs tabular-nums text-[var(--field-placeholder)]"
          aria-live="polite"
        >
          {value.length} / {MAX_CHARS_PER_FIELD}
        </span>
      </div>
      {onRemove ? (
        <div className="flex w-11 shrink-0 flex-col border-l border-[var(--field-border)] bg-[var(--field-bg)]">
          <button
            type="button"
            onClick={onRemove}
            className="flex min-h-[2.75rem] flex-1 items-center justify-center text-xl font-medium leading-none text-[var(--semantic-danger-inline)] transition-colors hover:bg-[var(--semantic-danger-hover)] hover:text-[var(--semantic-danger-title)]"
            aria-label={`Remove field ${lineIndex + 1}`}
          >
            ×
          </button>
        </div>
      ) : null}
    </div>
  );
}

function newEmptyRow(): VocabRow {
  return { id: crypto.randomUUID(), value: "" };
}

export function AddVocabPanel() {
  const titleId = useId();
  const lineIdPrefix = useId().replace(/:/g, "");
  const [rows, setRows] = useState<VocabRow[]>(() => [newEmptyRow()]);
  const rowsRef = useRef(rows);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveBusy, setSaveBusy] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveConfirmed, setSaveConfirmed] = useState(false);

  useEffect(() => {
    rowsRef.current = rows;
  }, [rows]);

  useEffect(() => {
    if (!saveConfirmed) return;
    const id = window.setTimeout(() => setSaveConfirmed(false), 4500);
    return () => window.clearTimeout(id);
  }, [saveConfirmed]);

  const nonEmptyWords = rows
    .map((r) => r.value.trim())
    .filter((w): w is string => Boolean(w));
  const atRowLimit = rows.length >= MAX_VOCAB_ROWS;
  const wordLabel =
    nonEmptyWords.length === 0
      ? "No words typed yet."
      : nonEmptyWords.length === 1
        ? `1 word: “${nonEmptyWords[0]}”`
        : `${nonEmptyWords.length} words`;

  function addRow() {
    if (rows.length >= MAX_VOCAB_ROWS) return;
    setRows((r) => [...r, newEmptyRow()]);
  }

  function updateRow(id: string, value: string) {
    setRows((list) =>
      list.map((row) => (row.id === id ? { ...row, value } : row)),
    );
  }

  function removeRow(id: string) {
    setRows((list) => {
      if (list.length <= 1) return list;
      return list.filter((row) => row.id !== id);
    });
  }

  async function confirmSave() {
    setSaveError(null);
    const words = rowsRef.current
      .map((r) => r.value.trim())
      .filter((w): w is string => Boolean(w));
    if (words.length === 0) {
      setSaveDialogOpen(false);
      return;
    }
    setSaveBusy(true);
    try {
      const result = await queueAddVocabSubmit({
        words,
        word_count: words.length,
      });
      if (!result.ok) {
        setSaveError(result.error);
        return;
      }
      setRows([newEmptyRow()]);
      setSaveDialogOpen(false);
      setSaveConfirmed(true);
    } finally {
      setSaveBusy(false);
    }
  }

  const btnSecondary =
    "rounded-2xl border border-[var(--border-default)] bg-[var(--field-bg)] px-4 py-2.5 text-sm font-medium text-[var(--field-text)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-elevated)]";

  const btnPrimary =
    "rounded-2xl border border-[var(--border-strong)] bg-[var(--nav-active-bg)] px-4 py-2.5 text-sm font-medium text-[var(--nav-active-fg)] transition-colors hover:opacity-90";

  return (
    <>
      <section className="rounded-3xl border border-[var(--border-default)] bg-[var(--surface-panel)] p-5 sm:p-6">
        {saveConfirmed ? (
          <div
            className="mb-4 rounded-2xl border border-[var(--semantic-success-border)] bg-[var(--semantic-success-bg)] px-4 py-3 text-sm leading-relaxed text-[var(--semantic-success-text)]"
            role="status"
            aria-live="polite"
          >
            Saved. Your words were submitted and will appear under current
            activities.
          </div>
        ) : null}
        <div className="space-y-3">
          {rows.map((row, index) => (
            <VocabLineField
              key={row.id}
              value={row.value}
              lineIndex={index}
              onChange={(v) => updateRow(row.id, v)}
              onRemove={
                rows.length > 1 ? () => removeRow(row.id) : undefined
              }
              lineIdPrefix={lineIdPrefix}
            />
          ))}
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={addRow}
            disabled={atRowLimit}
            title={
              atRowLimit
                ? `At most ${MAX_VOCAB_ROWS} entries at once`
                : "Add another field"
            }
            className={[
              "inline-flex h-10 min-w-10 items-center justify-center px-3 font-semibold rounded-2xl border text-sm transition-colors",
              atRowLimit
                ? "cursor-not-allowed border-[var(--border-default)] bg-[var(--surface-elevated)] text-[var(--field-placeholder)]"
                : `${btnSecondary}`,
            ].join(" ")}
            aria-label="Add another field"
            aria-disabled={atRowLimit}
          >
            +
          </button>
          <button
            type="button"
            disabled={nonEmptyWords.length === 0}
            onClick={() => {
              setSaveError(null);
              setSaveDialogOpen(true);
            }}
            className={[
              btnPrimary,
              nonEmptyWords.length === 0
                ? "cursor-not-allowed opacity-50"
                : "",
            ].join(" ")}
          >
            Save
          </button>
        </div>
        {atRowLimit ? (
          <p className="mt-2 text-xs text-[var(--text-muted)]">
            Maximum {MAX_VOCAB_ROWS} entries at a time. Save or remove a row to
            add more later.
          </p>
        ) : null}
      </section>

      {saveDialogOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="presentation"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/45 disabled:cursor-not-allowed"
            aria-label="Close dialog"
            disabled={saveBusy}
            onClick={() => !saveBusy && setSaveDialogOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="relative z-10 w-full max-w-md rounded-3xl border border-[var(--border-default)] bg-[var(--surface-panel-solid)] p-6 shadow-lg"
          >
            <h2
              id={titleId}
              className="text-base font-semibold text-[var(--foreground)]"
            >
              Save these words?
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-[var(--text-muted)]">
              Do you want to save the words you&apos;ve written? {wordLabel}
            </p>
            {saveError ? (
              <p className="mt-3 text-sm text-[var(--semantic-danger-inline)]" role="alert">
                {saveError}
              </p>
            ) : null}
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                className={btnSecondary}
                disabled={saveBusy}
                onClick={() => {
                  setSaveError(null);
                  setSaveDialogOpen(false);
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className={btnPrimary}
                disabled={saveBusy || nonEmptyWords.length === 0}
                onClick={() => void confirmSave()}
              >
                {saveBusy ? "Saving…" : "Save words"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
