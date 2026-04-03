"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Moon, Sun } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { LogoutButton } from "../_components/LogoutButton";
import { UpdatePasswordForm } from "../_components/UpdatePasswordForm";
import { toHtmlDatasetValue } from "@/lib/app-theme";
import { getSupabase } from "@/lib/supabase";
import type {
  UserSettingsProfile,
  UserSettingsSavePayload,
  UserSettingsSaveTrigger,
} from "./actions";
import { queueUserSettings } from "./actions";
import {
  parseSettingsTab,
  SETTINGS_TABS,
  type SettingsTabId,
} from "./settings-tabs";

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

const MAX_TOPICS = 100;

const settingsHeaderFabClass =
  "mt-0.5 inline-flex shrink-0 rounded-full border border-[var(--border-default)] bg-[var(--chrome-fab-bg)] p-2.5 text-[var(--foreground)] shadow-sm backdrop-blur transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--chrome-fab-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--foreground)]/15 disabled:cursor-not-allowed disabled:opacity-60 sm:mt-0";

export type StoryGenUsageCount = { key: string; count: number };

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
  initialTab: SettingsTabId;
  storyGenTopicUsage: StoryGenUsageCount[];
  storyGenToneUsage: StoryGenUsageCount[];
  settingsMessage: string | null;
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

function promptCountForTopicName(
  topicName: string,
  usage: StoryGenUsageCount[],
): number | null {
  const t = topicName.trim().toLowerCase();
  if (!t) return null;
  const hit = usage.find((u) => u.key.trim().toLowerCase() === t);
  return hit ? hit.count : null;
}

function promptCountForToneText(
  toneText: string,
  usage: StoryGenUsageCount[],
): number | null {
  return promptCountForTopicName(toneText, usage);
}

function totalStoriesInUsage(usage: StoryGenUsageCount[]): number {
  return usage.reduce((sum, row) => sum + row.count, 0);
}

function upsertTopicsFromBaseline(
  baseline: SavedBaseline,
): UserSettingsSavePayload["upsert_topics"] {
  return [
    ...baseline.existingTopics.map((t) => ({
      id: t.id,
      topic_name: t.topic_name,
      active: t.active,
    })),
    ...baseline.newTopics.map((t) => ({
      id: null,
      topic_name: t.topic_name,
      active: t.active,
    })),
  ];
}

function settingsTriggerForActiveTab(
  tab: SettingsTabId,
): UserSettingsSaveTrigger {
  if (tab === "basic") return "save_basic";
  if (tab === "topics") return "save_topics";
  if (tab === "tone") return "save_tone";
  return "save_all";
}

type PromptHistoryKind = "topic" | "tone";

type PromptHistoryModalProps = {
  open: boolean;
  kind: PromptHistoryKind | null;
  rows: StoryGenUsageCount[];
  onClose: () => void;
};

function PromptHistoryModal({ open, kind, rows, onClose }: PromptHistoryModalProps) {
  const title =
    kind === "topic"
      ? "Library history by topic"
      : kind === "tone"
        ? "Library history by tone"
        : "History";
  const fieldLabel = kind === "topic" ? "prompt_topic" : kind === "tone" ? "prompt_tone" : "";

  return (
    <AnimatePresence>
      {open && kind && (
        <motion.div
          key="prompt-history-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[55] flex items-center justify-center p-6"
          data-unsaved-ignore
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/20 backdrop-blur-[2px]"
            aria-label="Dismiss"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="prompt-history-title"
            className="relative flex max-h-[min(85vh,32rem)] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-[var(--border-default)] bg-[var(--surface-panel-solid)] shadow-xl"
          >
            <div className="shrink-0 border-b border-[var(--border-default)] px-5 py-4">
              <h2
                id="prompt-history-title"
                className="text-base font-semibold text-[var(--foreground)]"
              >
                {title}
              </h2>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
              <ul className="space-y-2 text-sm" role="list">
                {rows.map((row) => (
                  <li
                    key={row.key}
                    className="flex items-start justify-between gap-3 rounded-xl border border-[var(--border-default)] bg-[var(--field-bg)] px-3 py-2"
                  >
                    <span className="min-w-0 flex-1 break-words text-[var(--foreground)]">
                      {row.key}
                    </span>
                    <span className="shrink-0 tabular-nums text-xs text-[var(--text-muted)]">
                      ×{row.count}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="shrink-0 border-t border-[var(--border-default)] p-4">
              <button
                type="button"
                onClick={onClose}
                className="w-full rounded-2xl border border-[var(--border-default)] py-2.5 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--nav-hover-bg)]"
              >
                Close
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function UserSettingsClient({
  initialUser,
  initialTopics,
  initialTab,
  storyGenTopicUsage,
  storyGenToneUsage,
  settingsMessage,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabPanelId = useId();
  const [activeTab, setActiveTab] = useState<SettingsTabId>(initialTab);
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
  const [themeToggling, setThemeToggling] = useState(false);
  const [topicPendingDeleteKey, setTopicPendingDeleteKey] = useState<
    string | null
  >(null);
  const [pendingLeave, setPendingLeave] = useState<PendingLeave | null>(null);
  const [promptHistoryOpen, setPromptHistoryOpen] = useState<
    PromptHistoryKind | null
  >(null);
  const syncTabToUrl = useCallback(
    (id: SettingsTabId) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", id);
      router.replace(`/settings?${params.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  const selectTab = useCallback(
    (id: SettingsTabId) => {
      setActiveTab(id);
      syncTabToUrl(id);
    },
    [syncTabToUrl],
  );

  const tabParam = searchParams.get("tab");
  useEffect(() => {
    const next = parseSettingsTab(tabParam);
    setActiveTab((prev) => (prev === next ? prev : next));
  }, [tabParam]);

  const topicSlotsUsed = existingTopics.length + newTopics.length;
  const atTopicLimit = topicSlotsUsed >= MAX_TOPICS;

  const toneLibraryMatchCount = useMemo(
    () => promptCountForToneText(user.preferred_tone, storyGenToneUsage),
    [user.preferred_tone, storyGenToneUsage],
  );

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
    if (atTopicLimit) return;
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

  const handleThemeToggle = async () => {
    if (themeToggling) return;
    const prevTheme = user.app_theme;
    const nextTheme = prevTheme === "Light" ? "Dark" : "Light";
    setThemeToggling(true);
    setSaveError(null);
    setSaveSuccess(false);
    setUser((u) => ({ ...u, app_theme: nextTheme }));
    try {
      const payload: UserSettingsSavePayload = {
        user_settings: { ...savedBaseline.user, app_theme: nextTheme },
        upsert_topics: upsertTopicsFromBaseline(savedBaseline),
        deleted_ids: [...savedBaseline.deletedIds],
        settings_trigger: "theme_toggle",
      };
      const result = await queueUserSettings(payload);
      if (!result.ok) {
        throw new Error(result.error);
      }
      setSavedBaseline((b) => ({
        ...b,
        user: { ...b.user, app_theme: nextTheme },
      }));
      setSaveSuccess(true);
    } catch (err) {
      setUser((u) => ({ ...u, app_theme: prevTheme }));
      setSaveError(
        err instanceof Error ? err.message : "Could not save theme",
      );
    } finally {
      setThemeToggling(false);
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
        settings_trigger: settingsTriggerForActiveTab(activeTab),
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

  const panelClass =
    "rounded-3xl border border-[var(--border-default)] bg-[var(--surface-panel)] p-6 shadow-sm";

  return (
    <div className="relative mx-auto flex w-full max-w-3xl flex-col gap-6 py-4">
      <header className="mb-4">
        <div className="flex items-start gap-3 sm:items-center">
          <Link
            href="/"
            className={settingsHeaderFabClass}
            aria-label="Back to home"
          >
            <ArrowLeft className="h-5 w-5 shrink-0" aria-hidden />
          </Link>
          <div className="min-w-0 flex-1 text-center sm:text-left">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--text-muted)]">
              Settings
            </p>
            {settingsMessage ? (
              <p className="mt-2 text-sm text-[var(--prose-text)]">
                {settingsMessage}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => void handleThemeToggle()}
            disabled={themeToggling}
            className={settingsHeaderFabClass}
            aria-busy={themeToggling}
            aria-label={
              user.app_theme === "Light"
                ? "Switch to dark mode"
                : "Switch to light mode"
            }
          >
            {user.app_theme === "Light" ? (
              <Moon className="h-5 w-5 shrink-0" aria-hidden strokeWidth={2} />
            ) : (
              <Sun className="h-5 w-5 shrink-0" aria-hidden strokeWidth={2} />
            )}
          </button>
        </div>
      </header>

      <div
        role="tablist"
        aria-label="Settings sections"
        className="flex flex-wrap gap-2 border-b border-[var(--border-default)] pb-4"
      >
        {SETTINGS_TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`${tabPanelId}-tab-${tab.id}`}
              aria-selected={isActive}
              aria-controls={`${tabPanelId}-panel-${tab.id}`}
              onClick={() => selectTab(tab.id)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                isActive
                  ? "border border-[var(--border-strong)] bg-[var(--nav-active-bg)] text-[var(--nav-active-fg)]"
                  : "border border-transparent bg-transparent text-[var(--text-muted)] hover:bg-[var(--nav-hover-bg)] hover:text-[var(--foreground)]"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id={`${tabPanelId}-panel-basic`}
        aria-labelledby={`${tabPanelId}-tab-basic`}
        hidden={activeTab !== "basic"}
        className={activeTab === "basic" ? "" : "hidden"}
      >
        <div className="flex flex-col gap-6">
          <section className={panelClass}>
            <h2 className="text-base font-semibold text-[var(--foreground)]">
              Profile
            </h2>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              Username, native language, and the language you are learning.
            </p>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="space-y-1 md:col-span-2">
                <label className="text-xs font-medium text-[var(--prose-text)]">
                  Username
                </label>
                <input
                  type="text"
                  value={user.username}
                  onChange={(e) =>
                    handleUserChange("username", e.target.value)
                  }
                  className="mt-2 w-full rounded-2xl border border-[var(--field-border)] bg-[var(--field-bg)] px-3 py-2 text-sm text-[var(--field-text)] placeholder:text-[var(--field-placeholder)] focus:border-[var(--border-strong)] focus:outline-none focus:ring-0"
                  placeholder="Your username"
                />
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
                  className="mt-2 w-full rounded-2xl border border-[var(--field-border)] bg-[var(--field-bg)] px-3 py-2 text-sm text-[var(--field-text)] placeholder:text-[var(--field-placeholder)] focus:border-[var(--border-strong)] focus:outline-none focus:ring-0"
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
                  className="mt-2 w-full rounded-2xl border border-[var(--field-border)] bg-[var(--field-bg)] px-3 py-2 text-sm text-[var(--field-text)] placeholder:text-[var(--field-placeholder)] focus:border-[var(--border-strong)] focus:outline-none focus:ring-0"
                  placeholder="e.g. Spanish"
                />
              </div>
            </div>
          </section>

          <section className={panelClass}>
            <h2 className="text-base font-semibold text-[var(--foreground)]">
              Stories
            </h2>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              Default difficulty and target length for generated stories.
            </p>
            <div className="mt-5 space-y-6">
              <div className="space-y-1">
                <p className="text-xs font-medium text-[var(--prose-text)]">
                  Current level
                </p>
                <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                  Recommended: Start slightly below your current level.
                </p>
                <div className="mt-2 grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
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
                  Preferred story length (words)
                </label>
                <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                  Recommended: 400–800 (max 2500).
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
                  placeholder="e.g. 400"
                />
              </div>
            </div>
          </section>

          <section className={panelClass}>
            <h2 className="text-base font-semibold text-[var(--foreground)]">
              Vocab chunking
            </h2>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              When enabled, if saving a single word of vocabulary, words will be added to change it into a commonly used chunk of 2-3 words.
            </p>
            <ul className="mt-4 space-y-2">
              <li className="flex flex-col gap-2 rounded-2xl border border-[var(--border-default)] bg-[var(--field-bg)] px-3 py-2 text-sm text-[var(--field-text)] sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                <p className="min-w-0 flex-1 text-sm text-[var(--foreground)]">
                  Chunk single words
                </p>
                <label className="flex shrink-0 items-center gap-1.5 text-xs text-[var(--text-muted)]">
                  <input
                    type="checkbox"
                    checked={user.vocab_chunking}
                    onChange={(e) =>
                      handleUserChange("vocab_chunking", e.target.checked)
                    }
                    className="h-3.5 w-3.5 rounded border-[var(--border-strong)] text-[var(--nav-active-bg)] accent-[var(--nav-active-bg)] focus:ring-0"
                  />
                  <span>Active</span>
                </label>
              </li>
            </ul>
          </section>
        </div>
      </div>

      <div
        role="tabpanel"
        id={`${tabPanelId}-panel-topics`}
        aria-labelledby={`${tabPanelId}-tab-topics`}
        hidden={activeTab !== "topics"}
        className={activeTab === "topics" ? "" : "hidden"}
      >
        <div className="flex flex-col gap-6">
          <p className="mt-1 text-xs text-[var(--text-muted)]">What do you want to read about?

          </p>
          {storyGenTopicUsage.length > 0 && (
            <section className={panelClass}>
              <h2 className="text-base font-semibold text-[var(--foreground)]">
                Past Topics
              </h2>
              <button
                type="button"
                onClick={() => setPromptHistoryOpen("topic")}
                className="mt-4 w-full rounded-2xl border border-[var(--border-strong)] bg-[var(--nav-active-bg)] px-4 py-3 text-left text-sm font-semibold text-[var(--nav-active-fg)] shadow-sm transition-colors hover:opacity-90"
              >
                <span className="block">View</span>
                <span className="mt-0.5 block text-xs font-normal tabular-nums opacity-90">
                  {storyGenTopicUsage.length} distinct value
                  {storyGenTopicUsage.length === 1 ? "" : "s"} ·{" "}
                  {totalStoriesInUsage(storyGenTopicUsage)} stor
                  {totalStoriesInUsage(storyGenTopicUsage) === 1 ? "y" : "ies"}
                </span>
              </button>
            </section>
          )}

          <section className={panelClass}>
            <h2
              id="topic-memory-section-title"
              className="text-base font-semibold text-[var(--foreground)]"
            >
              Topic memory
            </h2>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              The number of written passages to keep in mind when creating new ones. This is used to avoid repeating the same topics.
            </p>
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

          <section className={panelClass}>
            <h2 className="text-base font-semibold text-[var(--foreground)]">
              Topic-rotation
            </h2>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              With topic memory being per topic, it is recommended to write varying topics. If you write "German culture" and "A peculiar point about German culture", you are bound to get similar writing.
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
                disabled={atTopicLimit}
              />
              <button
                type="button"
                onClick={handleAddTopic}
                className="inline-flex items-center justify-center rounded-2xl border border-[var(--border-strong)] bg-[var(--nav-active-bg)] px-4 py-2 text-sm font-semibold text-[var(--nav-active-fg)] shadow-sm transition-colors hover:opacity-90 disabled:opacity-50"
                disabled={!newTopicName.trim() || atTopicLimit}
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

              {allTopicsForDisplay.map((topic) => {
                const promptCount = promptCountForTopicName(
                  topic.topic_name,
                  storyGenTopicUsage,
                );
                return (
                  <li
                    key={topic.key}
                    className="flex flex-col gap-2 rounded-2xl border border-[var(--border-default)] bg-[var(--field-bg)] px-3 py-2 text-sm text-[var(--field-text)] sm:flex-row sm:items-start sm:gap-3"
                  >
                    {topic.isExisting ? (
                      <div className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                        <p className="w-full min-w-0 rounded-xl border border-[var(--border-default)] bg-[var(--surface-elevated)] px-2 py-1.5 text-sm text-[var(--foreground)]">
                          {topic.topic_name || (
                            <span className="text-[var(--field-placeholder)]">
                              (empty)
                            </span>
                          )}
                        </p>
                        {promptCount != null && (
                          <span className="shrink-0 text-xs tabular-nums text-[var(--text-muted)]">
                            {promptCount} stor
                            {promptCount === 1 ? "y" : "ies"} in library
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="flex w-full min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
                        <input
                          type="text"
                          value={topic.topic_name}
                          onChange={(e) =>
                            handleNewTopicNameChange(topic.key, e.target.value)
                          }
                          className="w-full min-w-0 rounded-xl border border-[var(--field-border)] bg-[var(--surface-panel-solid)] px-2 py-1 text-sm text-[var(--field-text)] placeholder:text-[var(--field-placeholder)] focus:border-[var(--border-strong)] focus:outline-none focus:ring-0 sm:flex-1"
                        />
                        {promptCount != null && (
                          <span className="shrink-0 text-xs tabular-nums text-[var(--text-muted)]">
                            {promptCount} stor
                            {promptCount === 1 ? "y" : "ies"} in library
                          </span>
                        )}
                      </div>
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
                );
              })}
            </ul>
          </section>
        </div>
      </div>

      <div
        role="tabpanel"
        id={`${tabPanelId}-panel-tone`}
        aria-labelledby={`${tabPanelId}-tab-tone`}
        hidden={activeTab !== "tone"}
        className={activeTab === "tone" ? "" : "hidden"}
      >
        <div className="flex flex-col gap-6">
          <p className="mt-1 text-xs text-[var(--text-muted)]">How would you like the reading material to be written?</p>
          {storyGenToneUsage.length > 0 && (
            <section className={panelClass}>
              <h2 className="text-base font-semibold text-[var(--foreground)]">
                Past Tones
              </h2>
              <button
                type="button"
                onClick={() => setPromptHistoryOpen("tone")}
                className="mt-4 w-full rounded-2xl border border-[var(--border-strong)] bg-[var(--nav-active-bg)] px-4 py-3 text-left text-sm font-semibold text-[var(--nav-active-fg)] shadow-sm transition-colors hover:opacity-90"
              >
                <span className="block">View</span>
                <span className="mt-0.5 block text-xs font-normal tabular-nums opacity-90">
                  {storyGenToneUsage.length} distinct value
                  {storyGenToneUsage.length === 1 ? "" : "s"} ·{" "}
                  {totalStoriesInUsage(storyGenToneUsage)} stor
                  {totalStoriesInUsage(storyGenToneUsage) === 1 ? "y" : "ies"}
                </span>
              </button>
            </section>
          )}

          <section
            className={`${panelClass} pointer-events-none select-none opacity-55`}
            aria-disabled
          >
            <h2 className="text-base font-semibold text-[var(--foreground)]">
              Saved tone (read-only)
            </h2>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              This is the tone stored on your profile. Editing here is disabled
              for now.
            </p>
            <div className="relative mt-4">
              <textarea
                readOnly
                rows={5}
                value={user.preferred_tone}
                tabIndex={-1}
                className="w-full resize-none rounded-2xl border border-[var(--field-border)] bg-[var(--field-bg)] px-3 py-3 text-sm leading-relaxed text-[var(--field-text)] placeholder:text-[var(--field-placeholder)]"
                placeholder="No tone saved yet."
              />
            </div>
            {toneLibraryMatchCount != null && (
              <p className="mt-2 text-xs tabular-nums text-[var(--text-muted)]">
                {toneLibraryMatchCount} stor
                {toneLibraryMatchCount === 1 ? "y" : "ies"} in your library
                match this saved tone (same text as{" "}
                <code className="text-[0.7rem]">prompt_tone</code>).
              </p>
            )}
          </section>
        </div>
      </div>

      <div
        role="tabpanel"
        id={`${tabPanelId}-panel-password`}
        aria-labelledby={`${tabPanelId}-tab-password`}
        hidden={activeTab !== "password"}
        className={activeTab === "password" ? "" : "hidden"}
      >
        <section className={panelClass}>
          <h2 className="text-base font-semibold text-[var(--foreground)]">
            Password
          </h2>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            At least 6 characters.
          </p>
          <div className="mt-5 sm:max-w-prose">
            <UpdatePasswordForm />
          </div>
        </section>
      </div>

      <div
        role="tabpanel"
        id={`${tabPanelId}-panel-logout`}
        aria-labelledby={`${tabPanelId}-tab-logout`}
        hidden={activeTab !== "logout"}
        className={activeTab === "logout" ? "" : "hidden"}
      >
        <section className={panelClass}>
          <h2 className="text-base font-semibold text-[var(--foreground)]">
            Log out
          </h2>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Sign out on this device. Unsaved settings changes are discarded.
          </p>
          <div className="mt-5">
            <LogoutButton variant="card" />
          </div>
        </section>
      </div>

      {activeTab !== "password" && activeTab !== "logout" && (
        <section className="mt-2 flex items-center justify-between gap-3">
          <div className="min-h-[1.5rem] text-xs">
            {saveError && (
              <span className="text-[var(--semantic-danger-inline)]">
                {saveError}
              </span>
            )}
            {saveSuccess && !saveError && (
              <span className="text-[var(--semantic-success-inline)]">
                Settings saved.
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={handleSaveAll}
            disabled={saving || activeTab === "tone"}
            title={
              activeTab === "tone"
                ? "Open Basic or Topics to save changes"
                : undefined
            }
            className="inline-flex items-center justify-center rounded-2xl border border-[var(--border-strong)] bg-[var(--nav-active-bg)] px-4 py-2.5 text-sm font-semibold text-[var(--nav-active-fg)] shadow-sm transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save all changes"}
          </button>
        </section>
      )}

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

      <PromptHistoryModal
        open={promptHistoryOpen !== null}
        kind={promptHistoryOpen}
        rows={
          promptHistoryOpen === "topic"
            ? storyGenTopicUsage
            : promptHistoryOpen === "tone"
              ? storyGenToneUsage
              : []
        }
        onClose={() => setPromptHistoryOpen(null)}
      />
    </div>
  );
}
