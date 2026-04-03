"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toHtmlDatasetValue } from "@/lib/app-theme";
import { getSupabase } from "@/lib/supabase";
import type {
  UserSettingsProfile,
  UserSettingsSavePayload,
} from "./actions";
import { queueUserSettings } from "./actions";

const DIFFICULTY_OPTIONS = [
  "A1",
  "A1/A2",
  "A2",
  "A2/B1",
  "B1",
  "B1/B2",
  "B2",
  "B2/C1",
] as const;

const APP_THEME_OPTIONS = ["Light", "Dark"] as const;

type ExistingTopic = {
  id: number | string;
  topic_name: string;
  active: boolean;
};

type NewTopic = {
  clientKey: string;
  topic_name: string;
  active: boolean;
};

type Props = {
  initialUser: UserSettingsProfile;
  initialTopics: ExistingTopic[];
};

type SavedBaseline = {
  user: UserSettingsProfile;
  existingTopics: ExistingTopic[];
  newTopics: NewTopic[];
  deletedIds: (number | string)[];
};

type PendingLeave =
  | { kind: "href"; href: string }
  | { kind: "logout" }
  | { kind: "back" };

function cloneBaseline(
  user: UserSettingsProfile,
  existingTopics: ExistingTopic[],
  newTopics: NewTopic[],
  deletedIds: (number | string)[],
): SavedBaseline {
  return {
    user: structuredClone(user),
    existingTopics: structuredClone(existingTopics),
    newTopics: structuredClone(newTopics),
    deletedIds: structuredClone(deletedIds),
  };
}

export function UserSettingsClient({
  initialUser,
  initialTopics,
}: Props) {
  const router = useRouter();
  const [user, setUser] = useState<UserSettingsProfile>(initialUser);
  const [existingTopics, setExistingTopics] =
    useState<ExistingTopic[]>(initialTopics);
  const [newTopics, setNewTopics] = useState<NewTopic[]>([]);
  const [deletedIds, setDeletedIds] = useState<(number | string)[]>([]);
  const [savedBaseline, setSavedBaseline] = useState<SavedBaseline>(() =>
    cloneBaseline(initialUser, initialTopics, [], []),
  );
  const [newTopicName, setNewTopicName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [topicPendingDeleteKey, setTopicPendingDeleteKey] = useState<
    string | null
  >(null);
  const [pendingLeave, setPendingLeave] = useState<PendingLeave | null>(null);

  const isDirty = useMemo(() => {
    if (JSON.stringify(user) !== JSON.stringify(savedBaseline.user))
      return true;
    if (
      JSON.stringify(existingTopics) !==
      JSON.stringify(savedBaseline.existingTopics)
    )
      return true;
    if (JSON.stringify(newTopics) !== JSON.stringify(savedBaseline.newTopics))
      return true;
    if (JSON.stringify(deletedIds) !== JSON.stringify(savedBaseline.deletedIds))
      return true;
    return false;
  }, [
    user,
    existingTopics,
    newTopics,
    deletedIds,
    savedBaseline,
  ]);

  const isDirtyRef = useRef(isDirty);
  isDirtyRef.current = isDirty;

  useEffect(() => {
    document.documentElement.dataset.appTheme = toHtmlDatasetValue(
      user.app_theme,
    );
  }, [user.app_theme]);

  useEffect(() => {
    if (!isDirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isDirty]);

  const tryLeave = useCallback(
    async (target: PendingLeave) => {
      setPendingLeave(null);
      if (target.kind === "href") {
        router.push(target.href);
        return;
      }
      if (target.kind === "back") {
        window.history.go(-2);
        return;
      }
      await getSupabase().auth.signOut();
      router.push("/login");
      router.refresh();
    },
    [router],
  );

  useEffect(() => {
    if (!isDirty) return;

    const pushTrap = () => {
      window.history.pushState(
        { __settingsUnsavedTrap: true },
        "",
        window.location.href,
      );
    };

    pushTrap();

    const onPopState = () => {
      if (!isDirtyRef.current) return;
      pushTrap();
      setPendingLeave({ kind: "back" });
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [isDirty]);

  useEffect(() => {
    if (!isDirty) return;

    const onClickCapture = (e: MouseEvent) => {
      const el = e.target as HTMLElement | null;
      if (!el) return;
      if (el.closest("[data-unsaved-ignore]")) return;

      const anchor = el.closest("a");
      if (anchor instanceof HTMLAnchorElement) {
        const hrefAttr = anchor.getAttribute("href");
        if (!hrefAttr || hrefAttr.startsWith("#")) return;
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        if (anchor.target === "_blank") return;
        let resolved: URL;
        try {
          resolved = new URL(hrefAttr, window.location.href);
        } catch {
          return;
        }
        if (resolved.origin !== window.location.origin) return;
        const here =
          window.location.pathname + window.location.search + window.location.hash;
        const there = resolved.pathname + resolved.search + resolved.hash;
        if (there === here) return;
        e.preventDefault();
        e.stopPropagation();
        setPendingLeave({
          kind: "href",
          href: resolved.pathname + resolved.search + resolved.hash,
        });
        return;
      }

      if (el.closest("[data-settings-logout]")) {
        e.preventDefault();
        e.stopPropagation();
        setPendingLeave({ kind: "logout" });
      }
    };

    document.addEventListener("click", onClickCapture, true);
    return () => document.removeEventListener("click", onClickCapture, true);
  }, [isDirty]);

  const handleUserChange = <K extends keyof UserSettingsProfile>(
    key: K,
    value: UserSettingsProfile[K],
  ) => {
    setUser((prev) => ({ ...prev, [key]: value }));
  };

  const handleAddTopic = () => {
    const trimmed = newTopicName.trim();
    if (!trimmed) return;
    setNewTopics((prev) => [
      ...prev,
      {
        clientKey: crypto.randomUUID(),
        topic_name: trimmed,
        active: true,
      },
    ]);
    setNewTopicName("");
  };

  const handleNewTopicNameChange = (clientKey: string, name: string) => {
    setNewTopics((prev) =>
      prev.map((t) =>
        t.clientKey === clientKey ? { ...t, topic_name: name } : t,
      ),
    );
  };

  const handleTopicToggle = (keyOrId: string) => {
    const isExisting = existingTopics.some((t) => String(t.id) === keyOrId);
    if (isExisting) {
      setExistingTopics((prev) =>
        prev.map((t) =>
          String(t.id) === keyOrId ? { ...t, active: !t.active } : t,
        ),
      );
    } else {
      setNewTopics((prev) =>
        prev.map((t) =>
          t.clientKey === keyOrId ? { ...t, active: !t.active } : t,
        ),
      );
    }
  };

  const handleTopicDelete = (keyOrId: string) => {
    const existing = existingTopics.find((t) => String(t.id) === keyOrId);
    if (existing) {
      setExistingTopics((prev) => prev.filter((t) => String(t.id) !== keyOrId));
      setDeletedIds((prev) => [...prev, existing.id]);
    } else {
      setNewTopics((prev) => prev.filter((t) => t.clientKey !== keyOrId));
    }
  };

  const handleSaveAll = async () => {
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    try {
      const payload: UserSettingsSavePayload = {
        user_settings: user,
        upsert_topics: [
          ...existingTopics.map((t) => ({
            id: t.id,
            topic_name: t.topic_name,
            active: t.active,
          })),
          ...newTopics.map((t) => ({
            id: null,
            topic_name: t.topic_name,
            active: t.active,
          })),
        ],
        deleted_ids: deletedIds,
      };
      const result = await queueUserSettings(payload);
      if (!result.ok) {
        throw new Error(result.error);
      }
      setSavedBaseline(cloneBaseline(user, existingTopics, newTopics, []));
      setDeletedIds([]);
      setSaveSuccess(true);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const allTopicsForDisplay = [
    ...existingTopics.map((t) => ({
      key: String(t.id),
      topic_name: t.topic_name,
      active: t.active,
      isExisting: true as const,
    })),
    ...newTopics.map((t) => ({
      key: t.clientKey,
      topic_name: t.topic_name,
      active: t.active,
      isExisting: false as const,
    })),
  ];

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 py-4">
      <section className="rounded-3xl border border-[var(--border-default)] bg-[var(--surface-panel)] p-6 shadow-sm">
        <h2 className="text-base font-semibold text-[var(--foreground)]">Profile</h2>
        <p className="mt-1 text-xs text-[var(--text-muted)]">
          Update your core reading preferences and language profile.
        </p>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <label className="text-xs font-medium text-[var(--prose-text)]">
              Username
            </label>
            <input
              type="text"
              value={user.username}
              onChange={(e) => handleUserChange("username", e.target.value)}
              className="w-full rounded-2xl border border-[var(--field-border)] bg-[var(--field-bg)] px-3 py-2 text-sm text-[var(--field-text)] placeholder:text-[var(--field-placeholder)] focus:border-[var(--border-strong)] focus:outline-none focus:ring-0"
              placeholder="Your username"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-medium text-[var(--prose-text)]">
              Vocab chunking (This is always on. It cannot yet be disabled despite visual indication)
            </label>
            <div className="mt-2 inline-flex rounded-full bg-[var(--surface-elevated)] p-0.5 text-xs text-[var(--text-muted)]">
              {([true, false] as const).map((value) => {
                const isActive = user.vocab_chunking === value;
                return (
                  <button
                    key={String(value)}
                    type="button"
                    onClick={() => handleUserChange("vocab_chunking", value)}
                    className={`px-3 py-1 rounded-full transition-colors ${
                      isActive
                        ? "bg-[var(--nav-active-bg)] text-[var(--nav-active-fg)]"
                        : "bg-transparent text-[var(--foreground)] hover:opacity-90"
                    }`}
                  >
                    {value ? "On" : "Off"}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1 md:col-span-2">
            <label className="text-xs font-medium text-[var(--prose-text)]">
              Appearance
            </label>
            <p className="mt-0.5 text-xs text-[var(--text-muted)]">
              App background and navigation colors. Saves with your profile.
            </p>
            <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
              {APP_THEME_OPTIONS.map((theme) => {
                const isSelected = user.app_theme === theme;
                return (
                  <button
                    key={theme}
                    type="button"
                    onClick={() => handleUserChange("app_theme", theme)}
                    className={`flex items-center justify-start gap-2 rounded-2xl border px-3 py-2 transition-colors ${
                      isSelected
                        ? "border-[var(--nav-active-bg)] bg-[var(--nav-active-bg)] text-[var(--nav-active-fg)]"
                        : "border-[var(--field-border)] bg-[var(--field-bg)] text-[var(--field-text)] hover:border-[var(--border-strong)]"
                    }`}
                  >
                    <span
                      className={`inline-block h-3 w-3 rounded-full border ${
                        isSelected
                          ? "border-[var(--nav-active-fg)] bg-[var(--nav-active-fg)]"
                          : "border-[var(--border-strong)]"
                      }`}
                    />
                    <span>{theme}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-[var(--prose-text)]">
              Native language
            </label>
            <input
              type="text"
              value={user.native_language}
              onChange={(e) =>
                handleUserChange("native_language", e.target.value)
              }
              className="w-full rounded-2xl border border-[var(--field-border)] bg-[var(--field-bg)] px-3 py-2 text-sm text-[var(--field-text)] placeholder:text-[var(--field-placeholder)] focus:border-[var(--border-strong)] focus:outline-none focus:ring-0"
              placeholder="e.g. English"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-[var(--prose-text)]">
              Target language
            </label>
            <input
              type="text"
              value={user.target_language}
              onChange={(e) =>
                handleUserChange("target_language", e.target.value)
              }
              className="w-full rounded-2xl border border-[var(--field-border)] bg-[var(--field-bg)] px-3 py-2 text-sm text-[var(--field-text)] placeholder:text-[var(--field-placeholder)] focus:border-[var(--border-strong)] focus:outline-none focus:ring-0"
              placeholder="e.g. Spanish"
            />
          </div>

          <div className="space-y-1 md:col-span-2">
            <label className="text-xs font-medium text-[var(--prose-text)]">
              Tone or personality for the writer
            </label>
            <div className="relative mt-2">
              <textarea
                rows={3}
                maxLength={200}
                value={user.preferred_tone}
                onChange={(e) =>
                  handleUserChange("preferred_tone", e.target.value)
                }
                className="w-full resize-none rounded-2xl border border-[var(--field-border)] bg-[var(--field-bg)] px-3 py-3 pb-8 text-sm leading-relaxed text-[var(--field-text)] placeholder:text-[var(--field-placeholder)] focus:border-[var(--border-strong)] focus:outline-none focus:ring-0"
                placeholder="Example: The omniscient narrator. Kind, wise, and insightful. Write like it's the winner for a teen literature contest."
              />
              <span className="absolute bottom-3 right-3 text-xs text-[var(--field-placeholder)]">
                {user.preferred_tone.length}/200
              </span>
            </div>
          </div>

          <div className="space-y-1 md:col-span-2">
            <label className="text-xs font-medium text-[var(--prose-text)]">
              Difficulty
            </label>
            <p className="mt-0.5 text-xs text-[var(--text-muted)]">
              Recommended: Start slightly below your current level.
            </p>
            <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
              {DIFFICULTY_OPTIONS.map((label) => {
                const isSelected = user.difficulty === label;
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() =>
                      handleUserChange(
                        "difficulty",
                        user.difficulty === label ? null : label,
                      )
                    }
                    className={`flex items-center justify-start gap-2 rounded-2xl border px-3 py-2 transition-colors ${
                      isSelected
                        ? "border-[var(--nav-active-bg)] bg-[var(--nav-active-bg)] text-[var(--nav-active-fg)]"
                        : "border-[var(--field-border)] bg-[var(--field-bg)] text-[var(--field-text)] hover:border-[var(--border-strong)]"
                    }`}
                  >
                    <span
                      className={`inline-block h-3 w-3 rounded-full border ${
                        isSelected
                          ? "border-[var(--nav-active-fg)] bg-[var(--nav-active-fg)]"
                          : "border-[var(--border-strong)]"
                      }`}
                    />
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-[var(--prose-text)]">
              Target word-count
            </label>
            <p className="mt-0.5 text-xs text-[var(--text-muted)]">
              Recommended: 400-800
            </p>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={user.word_target ?? ""}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, "");
                if (digits === "") {
                  handleUserChange("word_target", null);
                  return;
                }
                const n = parseInt(digits, 10);
                handleUserChange(
                  "word_target",
                  n > 2500 ? 2500 : n,
                );
              }}
              className="mt-2 w-full rounded-2xl border border-[var(--field-border)] bg-[var(--field-bg)] px-3 py-2 text-sm text-[var(--field-text)] placeholder:text-[var(--field-placeholder)] focus:border-[var(--border-strong)] focus:outline-none focus:ring-0"
              placeholder="e.g. 400 (max 2500)"
            />
          </div>

          {/* reading_level_desc removed per latest requirements */}
        </div>
      </section>

      <section className="rounded-3xl border border-[var(--border-default)] bg-[var(--surface-panel)] p-6 shadow-sm">
        <h2
          id="topic-memory-section-title"
          className="text-base font-semibold text-[var(--foreground)]"
        >
          Topic Memory
        </h2>
        <p className="mt-1 text-xs text-[var(--text-muted)]">The amount of articles/stories the system will look back to ensure a new topic. This is topic-specific, so if you want a unique reading material each time, it is advised to select varying topics.</p>
        <input
          id="last_stories_filter"
          name="last_stories_filter"
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={2}
          value={user.last_stories_filter ?? ""}
          onChange={(e) => {
            const digits = e.target.value.replace(/\D/g, "").slice(0, 2);
            if (digits === "") {
              handleUserChange("last_stories_filter", null);
              return;
            }
            const n = parseInt(digits, 10);
            handleUserChange(
              "last_stories_filter",
              n > 99 ? 99 : n,
            );
          }}
          aria-labelledby="topic-memory-section-title"
          className="mt-4 w-full rounded-2xl border border-[var(--field-border)] bg-[var(--field-bg)] px-3 py-2 text-sm text-[var(--field-text)] placeholder:text-[var(--field-placeholder)] focus:border-[var(--border-strong)] focus:outline-none focus:ring-0"
          placeholder="0–99"
        />
      </section>

      <section className="rounded-3xl border border-[var(--border-default)] bg-[var(--surface-panel)] p-6 shadow-sm">
        <h2 className="text-base font-semibold text-[var(--foreground)]">Topics</h2>
        <p className="mt-1 text-xs text-[var(--text-muted)]">
          Curate the themes and areas you want stories about.
        </p>

        <div className="mt-4 flex flex-col gap-3 rounded-2xl bg-[var(--surface-elevated)] p-3 sm:flex-row">
          <input
            type="text"
            value={newTopicName}
            onChange={(e) => setNewTopicName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddTopic();
              }
            }}
            className="flex-1 rounded-2xl border border-[var(--field-border)] bg-[var(--field-bg)] px-3 py-2 text-sm text-[var(--field-text)] placeholder:text-[var(--field-placeholder)] focus:border-[var(--border-strong)] focus:outline-none focus:ring-0"
            placeholder="Add a new topic (e.g. history, travel, science)…"
          />
          <button
            type="button"
            onClick={handleAddTopic}
            className="inline-flex items-center justify-center rounded-2xl border border-[var(--border-strong)] bg-[var(--nav-active-bg)] px-4 py-2 text-sm font-semibold text-[var(--nav-active-fg)] shadow-sm transition-colors hover:opacity-90 disabled:opacity-50"
            disabled={!newTopicName.trim()}
          >
            Add
          </button>
        </div>

        <ul className="mt-4 space-y-2">
          {allTopicsForDisplay.length === 0 && (
            <li className="rounded-2xl border border-dashed border-[var(--border-default)] bg-[var(--field-bg)] px-3 py-2 text-xs text-[var(--text-muted)]">
              No topics yet. Add a few to guide story prompts.
            </li>
          )}

          {allTopicsForDisplay.map((topic) => (
            <li
              key={topic.key}
              className="flex flex-col gap-2 rounded-2xl border border-[var(--border-default)] bg-[var(--field-bg)] px-3 py-2 text-sm text-[var(--field-text)] sm:flex-row sm:items-start sm:gap-3"
            >
              {topic.isExisting ? (
                <p className="w-full min-w-0 rounded-xl border border-[var(--border-default)] bg-[var(--surface-elevated)] px-2 py-1.5 text-sm text-[var(--foreground)] sm:flex-1">
                  {topic.topic_name || (
                    <span className="text-[var(--field-placeholder)]">(empty)</span>
                  )}
                </p>
              ) : (
                <input
                  type="text"
                  value={topic.topic_name}
                  onChange={(e) =>
                    handleNewTopicNameChange(topic.key, e.target.value)
                  }
                  className="w-full min-w-0 rounded-xl border border-[var(--field-border)] bg-[var(--surface-panel-solid)] px-2 py-1 text-sm text-[var(--field-text)] placeholder:text-[var(--field-placeholder)] focus:border-[var(--border-strong)] focus:outline-none focus:ring-0 sm:flex-1"
                />
              )}

              <div className="flex shrink-0 flex-wrap items-center gap-3">
                <label className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                  <input
                    type="checkbox"
                    checked={topic.active}
                    onChange={() => handleTopicToggle(topic.key)}
                    className="h-3.5 w-3.5 rounded border-[var(--border-strong)] text-[var(--nav-active-bg)] accent-[var(--nav-active-bg)] focus:ring-0"
                  />
                  <span>Active</span>
                </label>

                <button
                  type="button"
                  onClick={() => setTopicPendingDeleteKey(topic.key)}
                  className="rounded-full border border-[var(--semantic-danger-soft-border)] px-3 py-1 text-xs font-medium text-[var(--semantic-danger-inline)] transition-colors hover:border-[var(--semantic-danger-border)] hover:bg-[var(--semantic-danger-hover)]"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-2 flex items-center justify-between gap-3">
        <div className="min-h-[1.5rem] text-xs">
          {saveError && <span className="text-[var(--semantic-danger-inline)]">{saveError}</span>}
          {saveSuccess && !saveError && (
            <span className="text-[var(--semantic-success-inline)]">
              Settings saved.
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={handleSaveAll}
          disabled={saving}
          className="inline-flex items-center justify-center rounded-2xl border border-[var(--border-strong)] bg-[var(--nav-active-bg)] px-4 py-2.5 text-sm font-semibold text-[var(--nav-active-fg)] shadow-sm transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save all changes"}
        </button>
      </section>

      <AnimatePresence>
        {pendingLeave && (
          <motion.div
            key="unsaved-changes-confirm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-6"
            data-unsaved-ignore
          >
            <button
              type="button"
              className="absolute inset-0 bg-black/20 backdrop-blur-[2px]"
              aria-label="Dismiss"
              onClick={() => setPendingLeave(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.15 }}
              className="relative w-full max-w-sm"
            >
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="unsaved-changes-title"
                className="rounded-3xl border border-[var(--border-default)] bg-[var(--surface-panel-solid)] p-6 shadow-xl"
              >
                <p
                  id="unsaved-changes-title"
                  className="text-center text-sm text-[var(--prose-text)]"
                >
                  You have unsaved changes. Leave this page without saving?
                </p>
                <div className="mt-6 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setPendingLeave(null)}
                    className="flex-1 rounded-2xl border border-[var(--border-default)] py-2.5 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--nav-hover-bg)]"
                  >
                    Stay on page
                  </button>
                  <button
                    type="button"
                    onClick={() => pendingLeave && tryLeave(pendingLeave)}
                    className="flex-1 rounded-2xl border border-[var(--border-strong)] bg-[var(--nav-active-bg)] py-2.5 text-sm font-medium text-[var(--nav-active-fg)] transition-colors hover:opacity-90"
                  >
                    {pendingLeave?.kind === "logout"
                      ? "Leave without saving"
                      : "Leave page"}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {topicPendingDeleteKey && (
          <motion.div
            key="delete-topic-confirm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6"
          >
            <button
              type="button"
              className="absolute inset-0 bg-black/20 backdrop-blur-[2px]"
              aria-label="Dismiss"
              onClick={() => setTopicPendingDeleteKey(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.15 }}
              className="relative w-full max-w-sm"
            >
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="delete-topic-title"
                className="rounded-3xl border border-[var(--border-default)] bg-[var(--surface-panel-solid)] p-6 shadow-xl"
              >
                <p
                  id="delete-topic-title"
                  className="text-center text-sm text-[var(--prose-text)]"
                >
                  Are you sure you want to delete a topic?
                </p>
                <div className="mt-6 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setTopicPendingDeleteKey(null)}
                    className="flex-1 rounded-2xl border border-[var(--border-default)] py-2.5 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--nav-hover-bg)]"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleTopicDelete(topicPendingDeleteKey);
                      setTopicPendingDeleteKey(null);
                    }}
                    className="flex-1 rounded-2xl bg-red-600 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-700"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

