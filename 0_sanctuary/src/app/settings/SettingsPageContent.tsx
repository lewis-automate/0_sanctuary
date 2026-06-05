import type { UserSettingsProfile } from "./actions";
import { parseSettingsTab } from "./settings-tabs";
import { UserSettingsClient } from "./UserSettingsClient";
import {
  loadUserSettingsProfile,
  loadUserTopicsForSave,
} from "@/lib/user-settings-profile";
import { getAuthenticatedUser } from "@/lib/supabase/get-user";

type PageProps = {
  searchParams?:
    | Promise<{ message?: string; tab?: string }>
    | { message?: string; tab?: string };
};

export async function SettingsPageContent({ searchParams }: PageProps) {
  const params =
    searchParams instanceof Promise ? await searchParams : searchParams ?? {};
  const message = params.message;
  const initialTab = parseSettingsTab(
    typeof params.tab === "string" ? params.tab : null,
  );

  const { supabase, user } = await getAuthenticatedUser();

  let initialUser: UserSettingsProfile = {
    username: "",
    target_language: "",
    native_language: "",
    timezone: "",
    difficulty: null,
    word_target: null,
    last_stories_filter: null,
    preferred_tone: "",
    vocab_chunking: false,
    app_theme: "Light",
  };

  let initialTopics: {
    id: number | string;
    topic_name: string;
    active: boolean;
  }[] = [];

  if (user) {
    initialUser = await loadUserSettingsProfile(supabase, user.id);
    initialTopics = (await loadUserTopicsForSave(supabase, user.id)).map(
      (t) => ({
        id: t.id ?? t.topic_name,
        topic_name: t.topic_name,
        active: t.active,
      }),
    );
  }

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
      const key = trimmed.length > 0 ? trimmed.toLowerCase() : "blank";
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
    <UserSettingsClient
      key={user?.id ?? "guest"}
      initialUser={initialUser}
      initialTopics={initialTopics}
      initialTab={initialTab}
      storyGenTopicUsage={storyGenTopicUsage}
      storyGenToneUsage={storyGenToneUsage}
      settingsMessage={settingsMessage}
    />
  );
}
