export const SETTINGS_TABS = [
  { id: "basic", label: "Basic" },
  { id: "topics", label: "Topics" },
  { id: "tone", label: "Tone" },
  { id: "password", label: "Password" },
] as const;

export type SettingsTabId = (typeof SETTINGS_TABS)[number]["id"];

export function parseSettingsTab(
  raw: string | null | undefined,
): SettingsTabId {
  if (raw === "logout") return "basic";
  const hit = SETTINGS_TABS.find((t) => t.id === raw);
  return hit ? hit.id : "basic";
}
