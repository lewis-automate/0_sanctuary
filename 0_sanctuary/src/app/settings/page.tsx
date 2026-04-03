import { randomUUID } from "crypto";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { FadeIn } from "../_components/FadeIn";
import { LogoutButton } from "../_components/LogoutButton";
import type { UserSettingsProfile } from "./actions";
import { UserSettingsClient } from "./UserSettingsClient";
import { normalizeAppTheme } from "@/lib/app-theme";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{ message?: string }> | { message?: string };
};

function coerceVocabChunkingToBoolean(
  value: unknown,
): boolean {
  if (value === true) return true;
  if (value === false) return false;
  if (typeof value === "string") {
    const lower = value.toLowerCase();
    if (lower === "true" || lower === "on") return true;
    if (lower === "false" || lower === "off") return false;
  }
  return false;
}

function coerceLastStoriesFilter(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.min(99, Math.trunc(n)));
}

function coerceWordTarget(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.trunc(n);
}

function mapRowToUserProfile(
  row: Record<string, unknown>,
  source: "user_settings" | "users",
): UserSettingsProfile {
  const username =
    source === "users"
      ? String(row.name ?? row.username ?? "")
      : String(row.username ?? row.name ?? "");

  const levelRaw =
    (typeof row.reading_level_desc === "string"
      ? row.reading_level_desc
      : null) ??
    (typeof row.difficulty === "string" ? row.difficulty : null);
  const difficulty =
    typeof levelRaw === "string" && levelRaw.trim() !== ""
      ? levelRaw.trim()
      : null;

  return {
    username,
    target_language: String(row.target_language ?? ""),
    native_language: String(row.native_language ?? ""),
    difficulty,
    word_target: coerceWordTarget(row.word_target),
    last_stories_filter: coerceLastStoriesFilter(
      row.last_stories_filter ?? row.past,
    ),
    preferred_tone: String(row.preferred_tone ?? ""),
    vocab_chunking: coerceVocabChunkingToBoolean(row.vocab_chunking),
    app_theme: normalizeAppTheme(row.app_theme),
  };
}

const EMPTY_PROFILE: UserSettingsProfile = {
  username: "",
  target_language: "",
  native_language: "",
  difficulty: null,
  word_target: null,
  last_stories_filter: null,
  preferred_tone: "",
  vocab_chunking: false,
  app_theme: "Light",
};

export default async function SettingsPage({ searchParams }: PageProps) {
  const params =
    searchParams instanceof Promise ? await searchParams : searchParams ?? {};
  const message = params.message;
  const clientMountKey = randomUUID();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let initialUser: UserSettingsProfile = EMPTY_PROFILE;

  if (user) {
    let userSettingsRow: Record<string, unknown> | null = null;

    const byUserId = await supabase
      .from("user_settings")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (byUserId.error) {
      const msg = byUserId.error.message;
      const missingUserIdCol =
        /user_id/i.test(msg) &&
        (/does not exist/i.test(msg) || /schema cache/i.test(msg));
      if (!missingUserIdCol) {
        console.error("[Settings] user_settings (user_id) error:", msg);
      }
    } else if (byUserId.data) {
      userSettingsRow = byUserId.data as Record<string, unknown>;
    }

    if (!userSettingsRow) {
      const byId = await supabase
        .from("user_settings")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (byId.error) {
        console.error(
          "[Settings] user_settings (id) error:",
          byId.error.message,
        );
      } else if (byId.data) {
        userSettingsRow = byId.data as Record<string, unknown>;
      }
    }

    if (userSettingsRow) {
      initialUser = mapRowToUserProfile(userSettingsRow, "user_settings");
    } else {
      const usersRes = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (usersRes.error) {
        console.error("[Settings] users query error:", usersRes.error.message);
      }

      if (usersRes.data) {
        initialUser = mapRowToUserProfile(
          usersRes.data as Record<string, unknown>,
          "users",
        );
      }
    }
  }

  let topicRows: { id: string; topic_name: string | null; active: boolean }[] | null = null;
  if (user) {
    const res = await supabase
      .from("user_topics")
      .select("id, topic_name, active")
      .eq("user_id", user.id)
      .order("topic_name", { ascending: true });
    if (res.error) {
      console.error("[Settings] user_topics query error:", res.error.message);
    }
    topicRows = res.data;
  }

  const initialTopics =
    topicRows?.map((t) => ({
      id: String(t.id),
      topic_name: t.topic_name ?? "",
      active: !!t.active,
    })) ?? [];

  return (
    <FadeIn className="mx-auto w-full max-w-prose">
      <header className="mb-4">
        <div className="flex items-start gap-3 sm:items-center">
          <Link
            href="/"
            className="mt-0.5 inline-flex shrink-0 rounded-full border border-[var(--border-default)] bg-[var(--chrome-fab-bg)] p-2.5 text-[var(--foreground)] shadow-sm backdrop-blur transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--chrome-fab-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--foreground)]/15 sm:mt-0"
            aria-label="Back to home"
          >
            <ArrowLeft className="h-5 w-5 shrink-0" aria-hidden />
          </Link>
          <div className="min-w-0 flex-1 text-center sm:text-left">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--text-muted)]">
              Settings
            </p>
            {message && (
              <p className="mt-2 text-sm text-[var(--prose-text)]">
                {decodeURIComponent(message.replace(/\+/g, " "))}
              </p>
            )}
          </div>
        </div>
      </header>

      <div className="mb-5 flex gap-2 text-sm font-medium text-[var(--text-muted)]">
        <span className="rounded-full border border-[var(--border-strong)] bg-[var(--nav-active-bg)] px-3 py-1 text-xs text-[var(--nav-active-fg)]">
          User Settings
        </span>
        <Link
          href="/settings/password"
          className="rounded-full bg-transparent px-3 py-1 text-xs text-[var(--text-muted)] hover:bg-[var(--nav-hover-bg)] hover:text-[var(--foreground)]"
        >
          Password
        </Link>
      </div>

      <UserSettingsClient
        key={user ? `${user.id}-${clientMountKey}` : "guest"}
        initialUser={initialUser}
        initialTopics={initialTopics}
      />

      <div className="mt-6 space-y-3">
        <LogoutButton />
      </div>
    </FadeIn>
  );
}

