import { randomUUID } from "crypto";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { FadeIn } from "../_components/FadeIn";
import { LogoutButton } from "../_components/LogoutButton";
import type { UserSettingsProfile } from "./actions";
import { UserSettingsClient } from "./UserSettingsClient";
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
      <Link
        href="/"
        className="fixed left-[max(1rem,env(safe-area-inset-left))] top-[max(1rem,env(safe-area-inset-top))] z-[60] rounded-full border border-slate-200 bg-[#fbf5ef]/90 p-2.5 text-slate-700 shadow-sm backdrop-blur transition-colors hover:border-slate-300 hover:bg-[#f5ece3]/95 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950/20"
        aria-label="Back to home"
      >
        <ArrowLeft className="h-5 w-5 shrink-0" aria-hidden />
      </Link>

      <header className="mb-4 text-center sm:text-left">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
          Settings
        </p>
        {message && (
          <p className="mt-2 text-sm text-slate-600">
            {decodeURIComponent(message.replace(/\+/g, " "))}
          </p>
        )}
      </header>

      <div className="mb-5 flex gap-2 text-sm font-medium text-slate-600">
        <span className="rounded-full bg-slate-950 px-3 py-1 text-xs text-[#FDFCFB]">
          User Settings
        </span>
        <Link
          href="/settings/password"
          className="rounded-full bg-transparent px-3 py-1 text-xs text-slate-600 hover:bg-slate-900/5 hover:text-slate-900"
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

