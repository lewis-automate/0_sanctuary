"use client";

import { useState } from "react";
import type {
  UserSettingsProfile,
  UserSettingsSavePayload,
} from "./actions";
import { queueUserSettings } from "./actions";

const DIFFICULTY_OPTIONS = [
  "A2",
  "A2/B1",
  "B1",
  "B1/B2",
  "B2",
  "B2/C1",
  "C1",
] as const;

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

export function UserSettingsClient({
  initialUser,
  initialTopics,
}: Props) {
  const [user, setUser] = useState<UserSettingsProfile>(initialUser);
  const [existingTopics, setExistingTopics] =
    useState<ExistingTopic[]>(initialTopics);
  const [newTopics, setNewTopics] = useState<NewTopic[]>([]);
  const [deletedIds, setDeletedIds] = useState<(number | string)[]>([]);
  const [newTopicName, setNewTopicName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

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

  const handleTopicChange = (keyOrId: string, name: string) => {
    const isExisting = existingTopics.some((t) => String(t.id) === keyOrId);
    if (isExisting) {
      setExistingTopics((prev) =>
        prev.map((t) =>
          String(t.id) === keyOrId ? { ...t, topic_name: name } : t,
        ),
      );
    } else {
      setNewTopics((prev) =>
        prev.map((t) =>
          t.clientKey === keyOrId ? { ...t, topic_name: name } : t,
        ),
      );
    }
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
    })),
    ...newTopics.map((t) => ({
      key: t.clientKey,
      topic_name: t.topic_name,
      active: t.active,
    })),
  ];

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 py-4">
      <section className="rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">Profile</h2>
        <p className="mt-1 text-xs text-slate-500">
          Update your core reading preferences and language profile.
        </p>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700">
              Username
            </label>
            <input
              type="text"
              value={user.username}
              onChange={(e) => handleUserChange("username", e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none"
              placeholder="Your username"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-700">
              Vocab chunking
            </label>
            <div className="mt-2 inline-flex rounded-full bg-slate-100 p-0.5 text-xs text-slate-600">
              {([true, false] as const).map((value) => {
                const isActive = user.vocab_chunking === value;
                return (
                  <button
                    key={String(value)}
                    type="button"
                    onClick={() => handleUserChange("vocab_chunking", value)}
                    className={`px-3 py-1 rounded-full transition-colors ${
                      isActive
                        ? "bg-slate-900 text-[#FDFCFB]"
                        : "bg-transparent text-slate-700 hover:text-slate-900"
                    }`}
                  >
                    {value ? "On" : "Off"}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700">
              Native language
            </label>
            <input
              type="text"
              value={user.native_language}
              onChange={(e) =>
                handleUserChange("native_language", e.target.value)
              }
              className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none"
              placeholder="e.g. English"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700">
              Target language
            </label>
            <input
              type="text"
              value={user.target_language}
              onChange={(e) =>
                handleUserChange("target_language", e.target.value)
              }
              className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none"
              placeholder="e.g. Spanish"
            />
          </div>

          <div className="space-y-1 md:col-span-2">
            <label className="text-xs font-medium text-slate-700">
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
                className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-3 py-3 pb-8 text-sm leading-relaxed text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none"
                placeholder="Example: The omniscient narrator. Kind, wise, and insightful. Write like it's the winner for a teen literature contest."
              />
              <span className="absolute bottom-3 right-3 text-xs text-slate-400">
                {user.preferred_tone.length}/200
              </span>
            </div>
          </div>

          <div className="space-y-1 md:col-span-2">
            <label className="text-xs font-medium text-slate-700">
              Difficulty
            </label>
            <p className="mt-0.5 text-xs text-slate-500">
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
                        ? "border-slate-900 bg-slate-900 text-[#FDFCFB]"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-white"
                    }`}
                  >
                    <span
                      className={`inline-block h-3 w-3 rounded-full border ${
                        isSelected
                          ? "border-[#FDFCFB] bg-[#FDFCFB]"
                          : "border-slate-300"
                      }`}
                    />
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700">
              Target word-count
            </label>
            <p className="mt-0.5 text-xs text-slate-500">
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
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none"
              placeholder="e.g. 400 (max 2500)"
            />
          </div>

          {/* reading_level_desc removed per latest requirements */}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">Topics</h2>
        <p className="mt-1 text-xs text-slate-500">
          Curate the themes and areas you want stories about.
        </p>

        <div className="mt-4 flex flex-col gap-3 rounded-2xl bg-slate-50/80 p-3 sm:flex-row">
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
            className="flex-1 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none"
            placeholder="Add a new topic (e.g. history, travel, science)…"
          />
          <button
            type="button"
            onClick={handleAddTopic}
            className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-[#FDFCFB] shadow-sm transition-colors hover:bg-slate-800 disabled:opacity-50"
            disabled={!newTopicName.trim()}
          >
            Add
          </button>
        </div>

        <ul className="mt-4 space-y-2">
          {allTopicsForDisplay.length === 0 && (
            <li className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
              No topics yet. Add a few to guide story prompts.
            </li>
          )}

          {allTopicsForDisplay.map((topic) => (
            <li
              key={topic.key}
              className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800"
            >
              <input
                type="text"
                value={topic.topic_name}
                onChange={(e) =>
                  handleTopicChange(topic.key, e.target.value)
                }
                className="flex-1 rounded-xl border border-slate-200 bg-white px-2 py-1 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none"
              />

              <label className="flex items-center gap-1.5 text-xs text-slate-600">
                <input
                  type="checkbox"
                  checked={topic.active}
                  onChange={() => handleTopicToggle(topic.key)}
                  className="h-3.5 w-3.5 rounded border-slate-300 text-slate-900 focus:ring-0"
                />
                <span>Active</span>
              </label>

              <button
                type="button"
                onClick={() => handleTopicDelete(topic.key)}
                className="ml-1 inline-flex h-7 w-7 items-center justify-center rounded-full border border-red-100 text-xs text-red-500 hover:border-red-200 hover:bg-red-50"
                aria-label="Delete topic"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-2 flex items-center justify-between gap-3">
        <div className="min-h-[1.5rem] text-xs">
          {saveError && <span className="text-red-600">{saveError}</span>}
          {saveSuccess && !saveError && (
            <span className="text-emerald-600">Settings saved.</span>
          )}
        </div>
        <button
          type="button"
          onClick={handleSaveAll}
          disabled={saving}
          className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-[#FDFCFB] shadow-sm transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save all changes"}
        </button>
      </section>
    </div>
  );
}

