"use client";

import { Moon, Sun } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { queueAppThemeToggle } from "@/app/settings/actions";
import {
  type AppThemePreference,
  toHtmlDatasetValue,
} from "@/lib/app-theme";

export const settingsThemeFabClass =
  "mt-0.5 inline-flex shrink-0 rounded-full border border-[var(--border-default)] bg-[var(--chrome-fab-bg)] p-2.5 text-[var(--foreground)] shadow-sm backdrop-blur transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--chrome-fab-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--foreground)]/15 disabled:cursor-not-allowed disabled:opacity-60 sm:mt-0";

export const readerThemeFabClass =
  "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--reader-control-border)] bg-[var(--reader-control-bg)] text-[var(--reader-control-icon)] shadow-sm transition-colors duration-200 hover:border-[var(--border-strong)] hover:bg-[var(--surface-elevated)] disabled:cursor-not-allowed disabled:opacity-45";

type Props = {
  initialTheme: AppThemePreference;
  className?: string;
  /** Called after the theme is saved successfully (e.g. settings baseline sync). */
  onSaved?: (theme: AppThemePreference) => void;
  onError?: (message: string) => void;
};

export function ThemeToggleButton({
  initialTheme,
  className = settingsThemeFabClass,
  onSaved,
  onError,
}: Props) {
  const [theme, setTheme] = useState(initialTheme);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setTheme(initialTheme);
  }, [initialTheme]);

  useEffect(() => {
    document.documentElement.dataset.appTheme = toHtmlDatasetValue(theme);
  }, [theme]);

  const handleToggle = useCallback(async () => {
    if (busy) return;
    const prevTheme = theme;
    const nextTheme = prevTheme === "Light" ? "Dark" : "Light";
    setBusy(true);
    setTheme(nextTheme);
    try {
      const result = await queueAppThemeToggle(nextTheme);
      if (!result.ok) {
        throw new Error(result.error);
      }
      onSaved?.(nextTheme);
    } catch (err) {
      setTheme(prevTheme);
      onError?.(
        err instanceof Error ? err.message : "Could not save theme",
      );
    } finally {
      setBusy(false);
    }
  }, [busy, onError, onSaved, theme]);

  return (
    <button
      type="button"
      onClick={() => void handleToggle()}
      disabled={busy}
      className={className}
      aria-busy={busy}
      aria-label={
        theme === "Light" ? "Switch to dark mode" : "Switch to light mode"
      }
    >
      {theme === "Light" ? (
        <Moon className="h-5 w-5 shrink-0" aria-hidden strokeWidth={2} />
      ) : (
        <Sun className="h-5 w-5 shrink-0" aria-hidden strokeWidth={2} />
      )}
    </button>
  );
}
