import { BookOpen, Plus } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

export const homeActionTilePrimaryClass =
  "flex h-full w-full min-h-[3rem] flex-col items-start gap-2 rounded-xl border border-[var(--border-strong)] bg-[var(--nav-active-bg)] px-3 py-2.5 text-left shadow-sm transition-[opacity,transform] hover:opacity-90 active:scale-[0.995] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--foreground)]/20";

export const homeActionTileSecondaryClass =
  "flex h-full w-full min-h-[3rem] flex-col items-start gap-2 rounded-xl border border-[var(--border-default)] bg-[var(--surface-panel)] px-3 py-2.5 text-left shadow-sm transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-elevated)] active:bg-[var(--surface-elevated)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--foreground)]/20 disabled:cursor-not-allowed disabled:opacity-60";

export const homeActionTilePrimaryIconBadgeClass =
  "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--nav-active-fg)]/15 text-[var(--nav-active-fg)]";

export const homeActionTileSecondaryIconBadgeClass =
  "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-elevated)] text-[var(--nav-idle-text)] ring-1 ring-[var(--border-default)]";

export const homeActionTilePrimaryTitleClass =
  "text-sm font-semibold leading-snug text-[var(--nav-active-fg)]";

export const homeActionTileSecondaryTitleClass =
  "text-sm font-medium leading-snug text-[var(--foreground)]";

export const homeActionTilePrimarySubtitleClass =
  "text-xs leading-snug text-[var(--nav-active-fg)]/75";

export const homeActionTileSecondarySubtitleClass =
  "text-xs leading-snug text-[var(--text-muted)]";

type IconWithPlusBadgeProps = {
  className?: string;
  iconClassName?: string;
  badgeClassName?: string;
};

export function IconWithPlusBadge({
  className = "relative inline-flex h-4 w-4 shrink-0",
  iconClassName = "h-4 w-4",
  badgeClassName = "absolute -bottom-0.5 -right-1 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-[var(--nav-active-bg)] text-[var(--nav-active-fg)] ring-1 ring-[var(--surface-elevated)]",
}: IconWithPlusBadgeProps = {}) {
  return (
    <span className={className} aria-hidden>
      <BookOpen className={iconClassName} strokeWidth={2} />
      <span className={badgeClassName}>
        <Plus className="h-1.5 w-1.5" strokeWidth={3} />
      </span>
    </span>
  );
}

type HomeActionTileProps = {
  href: string;
  title: string;
  subtitle?: string;
  icon: ReactNode;
  variant?: "primary" | "secondary";
  className?: string;
};

export function HomeActionTile({
  href,
  title,
  subtitle,
  icon,
  variant = "secondary",
  className = "",
}: HomeActionTileProps) {
  const isPrimary = variant === "primary";
  const tileClass = isPrimary
    ? homeActionTilePrimaryClass
    : homeActionTileSecondaryClass;
  const badgeClass = isPrimary
    ? homeActionTilePrimaryIconBadgeClass
    : homeActionTileSecondaryIconBadgeClass;
  const titleClass = isPrimary
    ? homeActionTilePrimaryTitleClass
    : homeActionTileSecondaryTitleClass;
  const subtitleClass = isPrimary
    ? homeActionTilePrimarySubtitleClass
    : homeActionTileSecondarySubtitleClass;

  return (
    <Link href={href} className={`${tileClass} ${className}`.trim()}>
      <span className={badgeClass}>{icon}</span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className={titleClass}>{title}</span>
        {subtitle ? <span className={subtitleClass}>{subtitle}</span> : null}
      </span>
    </Link>
  );
}
