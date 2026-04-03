import { randomUUID } from "crypto";
import { Suspense } from "react";
import { FadeIn } from "../_components/FadeIn";
import type { UserSettingsProfile } from "./actions";
import { parseSettingsTab } from "./settings-tabs";
import { UserSettingsClient } from "./UserSettingsClient";
import { normalizeAppTheme } from "@/lib/app-theme";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?:
    | Promise<{ message?: string; tab?: string }>
    | { message?: string; tab?: string };
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
  const initialTab = parseSettingsTab(
    typeof params.tab === "string" ? params.tab : null,
  );
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

  type UsageCount = { key: string; count: number };

  function countsFromPromptField(
    rows: Record<string, unknown>[] | null,
    field: "prompt_topic" | "prompt_tone",
  ): UsageCount[] {
    if (!rows?.length) return [];
    const map = new Map<string, number>();
    for (const row of rows) {
      const raw = row[field];
      const trimmed = typeof raw === "string" ? raw.trim() : "";
      const key = trimmed.length > 0 ? trimmed : "blank";
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return [...map.entries()]
      .map(([key, count]) => ({ key, count }))
      .sort((a, b) => b.count - a.count);
  }

  let storyGenTopicUsage: UsageCount[] = [];
  let storyGenToneUsage: UsageCount[] = [];

  if (user) {
    const storiesRes = await supabase
      .from("stories")
      .select("prompt_topic, prompt_tone")
      .eq("original_author_id", user.id);

    if (storiesRes.error) {
      console.error(
        "[Settings] stories prompt_topic / prompt_tone error:",
        storiesRes.error.message,
      );
    } else if (storiesRes.data) {
      storyGenTopicUsage = countsFromPromptField(
        storiesRes.data as Record<string, unknown>[],
        "prompt_topic",
      );
      storyGenToneUsage = countsFromPromptField(
        storiesRes.data as Record<string, unknown>[],
        "prompt_tone",
      );
    }
  }

  const settingsMessage =
    typeof message === "string" && message.length > 0
      ? decodeURIComponent(message.replace(/\+/g, " "))
      : null;

  return (
    <FadeIn className="mx-auto w-full max-w-3xl">
      <Suspense
        fallback={
          <div className="py-10 text-center text-sm text-[var(--text-muted)]">
            Loading settings…
          </div>
        }
      >
        <UserSettingsClient
          key={user ? `${user.id}-${clientMountKey}` : "guest"}
          initialUser={initialUser}
          initialTopics={initialTopics}
          initialTab={initialTab}
          storyGenTopicUsage={storyGenTopicUsage}
          storyGenToneUsage={storyGenToneUsage}
          settingsMessage={settingsMessage}
        />
      </Suspense>
    </FadeIn>
  );
}

