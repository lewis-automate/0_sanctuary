/** Stored values are English names — used verbatim in LLM prompts (e.g. "learner's native language"). */

export const NATIVE_LANGUAGE_OTHER_VALUE = "__other__";

export const NATIVE_LANGUAGE_PRESETS: readonly { value: string; label: string }[] =
  [
    { value: "English", label: "English" },
    { value: "Spanish", label: "Spanish" },
    { value: "French", label: "French" },
    { value: "German", label: "German" },
    { value: "Italian", label: "Italian" },
    { value: "Portuguese", label: "Portuguese" },
    { value: "Dutch", label: "Dutch" },
    { value: "Russian", label: "Russian" },
    { value: "Japanese", label: "Japanese" },
    { value: "Korean", label: "Korean" },
    { value: "Chinese (Mandarin)", label: "Chinese (Mandarin)" },
    { value: "Arabic", label: "Arabic" },
    { value: "Hindi", label: "Hindi" },
    { value: "Turkish", label: "Turkish" },
    { value: "Polish", label: "Polish" },
    { value: "Vietnamese", label: "Vietnamese" },
    { value: "Indonesian", label: "Indonesian" },
    { value: "Thai", label: "Thai" },
    { value: "Swedish", label: "Swedish" },
    { value: "Norwegian", label: "Norwegian" },
    { value: "Danish", label: "Danish" },
    { value: "Ukrainian", label: "Ukrainian" },
    { value: "Hebrew", label: "Hebrew" },
    { value: "Greek", label: "Greek" },
  ];

const PRESET_VALUES = new Set(
  NATIVE_LANGUAGE_PRESETS.map((p) => p.value),
);

export function getNativeLanguageSelectValue(native_language: string): string {
  const t = native_language.trim();
  if (!t) return "";
  if (PRESET_VALUES.has(t)) return t;
  return NATIVE_LANGUAGE_OTHER_VALUE;
}

export function isNativeLanguagePreset(native_language: string): boolean {
  const t = native_language.trim();
  if (!t) return false;
  return PRESET_VALUES.has(t);
}
