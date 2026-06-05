"use client";

type Props = {
  variant: "success" | "error";
  children: React.ReactNode;
  className?: string;
};

const variantClass = {
  success:
    "border-[var(--semantic-success-border)] bg-[var(--semantic-success-bg)] text-[var(--semantic-success-text)]",
  error:
    "border-[var(--semantic-danger-border)] bg-[var(--semantic-danger-bg)] text-[var(--semantic-danger-inline)]",
} as const;

/** Lightweight inline status banner shared across writer, settings-adjacent flows, etc. */
export function StatusBanner({ variant, children, className = "" }: Props) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`rounded-2xl border px-4 py-3 text-sm leading-relaxed ${variantClass[variant]} ${className}`}
    >
      {children}
    </div>
  );
}
