import Link from "next/link";
import { FadeIn } from "../_components/FadeIn";
import { LogoutButton } from "../_components/LogoutButton";
import { UserSettingsClient } from "./UserSettingsClient";
import { createClient } from "@/lib/supabase/server";

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

export default async function SettingsPage({ searchParams }: PageProps) {
  const params =
    searchParams instanceof Promise ? await searchParams : searchParams ?? {};
  const message = params.message;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const DIFFICULTY_OPTIONS = [
    "A2",
    "A2/B1",
    "B1",
    "B1/B2",
    "B2",
    "B2/C1",
    "C1",
  ];

  let settingsRow: Record<string, unknown> | null = null;

  if (user) {
    const { data, error } = await supabase
      .from("user_settings")
      .select(
        "username, target_language, native_language, reading_level_desc, word_target, preferred_tone, vocab_chunking",
      )
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      console.error("[Settings] user_settings query error:", error.message);
    }
    settingsRow = data;

    if (!settingsRow) {
      const { data: usersRow } = await supabase
        .from("users")
        .select(
          "name, target_language, native_language, reading_level_desc, word_target, preferred_tone, vocab_chunking",
        )
        .eq("id", user.id)
        .maybeSingle();

      if (usersRow) {
        const levelDesc = usersRow.reading_level_desc ?? "";
        const difficulty =
          typeof levelDesc === "string" &&
          DIFFICULTY_OPTIONS.includes(levelDesc)
            ? levelDesc
            : null;
        settingsRow = {
          username: usersRow.name ?? "",
          target_language: usersRow.target_language ?? "",
          native_language: usersRow.native_language ?? "",
          difficulty,
          word_target: usersRow.word_target ?? null,
          preferred_tone: usersRow.preferred_tone ?? "",
          vocab_chunking: usersRow.vocab_chunking,
        };
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

  const difficultyFromRow =
    (settingsRow?.reading_level_desc as string) ??
    (settingsRow?.difficulty as string) ??
    null;

  const initialUser = {
    username: (settingsRow?.username as string) ?? "",
    target_language: (settingsRow?.target_language as string) ?? "",
    native_language: (settingsRow?.native_language as string) ?? "",
    difficulty: difficultyFromRow,
    word_target: (settingsRow?.word_target as number | null) ?? null,
    preferred_tone: (settingsRow?.preferred_tone as string) ?? "",
    vocab_chunking: coerceVocabChunkingToBoolean(settingsRow?.vocab_chunking),
  };

  const initialTopics =
    topicRows?.map((t) => ({
      id: String(t.id),
      topic_name: t.topic_name ?? "",
      active: !!t.active,
    })) ?? [];

  return (
    <FadeIn className="mx-auto w-full max-w-prose">
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
        <Link
          href="/settings/updates"
          className="rounded-full bg-transparent px-3 py-1 text-xs text-slate-600 hover:bg-slate-900/5 hover:text-slate-900"
        >
          Updates
        </Link>
      </div>

      <UserSettingsClient
        initialUser={initialUser}
        initialTopics={initialTopics}
      />

      <div className="mt-6 space-y-3">
        <LogoutButton />
      </div>
    </FadeIn>
  );
}

