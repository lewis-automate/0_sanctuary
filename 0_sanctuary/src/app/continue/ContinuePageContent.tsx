import Link from "next/link";
import { redirect } from "next/navigation";
import { QuickCreateStoryButton } from "../_components/QuickCreateStoryButton";
import { FadeIn } from "../_components/FadeIn";
import { isReaderHref, resolveQuickReadHref } from "@/lib/quick-read";
import { getAuthenticatedUser } from "@/lib/supabase/get-user";

const quickActionBtn =
  "w-full rounded-2xl border border-[var(--border-default)] bg-[var(--surface-panel)] px-4 py-3.5 text-center shadow-sm transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-elevated)] active:bg-[var(--surface-elevated)]";

const quickActionTitle =
  "block text-center text-sm font-medium text-[var(--foreground)]";

const quickActionSub =
  "mt-1 block text-center text-xs font-normal leading-snug text-[var(--text-muted)]";

const secondaryCtaBtn =
  "inline-flex items-center justify-center rounded-2xl border border-[var(--border-default)] bg-[var(--field-bg)] px-4 py-3 text-sm font-semibold text-[var(--field-text)] shadow-sm transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-elevated)]";

const primaryCtaBtn =
  "inline-flex items-center justify-center rounded-2xl border border-[var(--border-strong)] bg-[var(--nav-active-bg)] px-4 py-3 text-sm font-semibold text-[var(--nav-active-fg)] shadow-sm transition-colors hover:opacity-90";

export async function ContinuePageContent() {
  const { supabase, user } = await getAuthenticatedUser();
  if (!user) redirect("/login");

  const quickReadHref = await resolveQuickReadHref(supabase, user.id);
  const hasNextStory = isReaderHref(quickReadHref);

  return (
    <FadeIn className="mx-auto w-full max-w-prose">
      <div className="space-y-6 py-10 text-center">
        <div className="space-y-2">
          <p className="text-2xl font-semibold text-[var(--foreground)] sm:text-3xl">
            Good Job!
          </p>
          <p className="text-base leading-relaxed text-[var(--text-muted)]">
            Keep the momentum going~
          </p>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {hasNextStory ? (
            <Link href={quickReadHref} className={`${primaryCtaBtn} sm:col-span-2`}>
              Read next story
            </Link>
          ) : (
            <Link href="/library?show=all" className={`${primaryCtaBtn} sm:col-span-2`}>
              Browse library
            </Link>
          )}
          <Link
            href="/vocab?tab=review&flow=rapid-review"
            className={secondaryCtaBtn}
          >
            Review vocab
          </Link>
          <Link href="/writing?tab=written" className={secondaryCtaBtn}>
            Writing feedback
          </Link>
          {!hasNextStory ? null : (
            <Link href="/library" className={`${secondaryCtaBtn} sm:col-span-2`}>
              Library
            </Link>
          )}
        </div>

        <div className="pt-2 text-center">
          <QuickCreateStoryButton
            className={quickActionBtn}
            titleClassName={quickActionTitle}
            subClassName={quickActionSub}
          />
        </div>
      </div>
    </FadeIn>
  );
}
