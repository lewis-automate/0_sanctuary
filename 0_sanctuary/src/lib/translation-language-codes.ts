/** Map stored language names (Settings / stories) to ISO 639-1 codes for Google Translate. */

const LANGUAGE_NAME_TO_CODE: Record<string, string> = {
  english: "en",
  spanish: "es",
  french: "fr",
  german: "de",
  italian: "it",
  portuguese: "pt",
  dutch: "nl",
  russian: "ru",
  japanese: "ja",
  korean: "ko",
  "chinese (mandarin)": "zh-CN",
  chinese: "zh-CN",
  mandarin: "zh-CN",
  arabic: "ar",
  hindi: "hi",
  turkish: "tr",
  polish: "pl",
  vietnamese: "vi",
  indonesian: "id",
  thai: "th",
  swedish: "sv",
  norwegian: "no",
  danish: "da",
  ukrainian: "uk",
  hebrew: "he",
  greek: "el",
};

const SEGMENTER_LOCALE: Record<string, string> = {
  en: "en",
  es: "es",
  fr: "fr",
  de: "de",
  it: "it",
  pt: "pt",
  nl: "nl",
  ru: "ru",
  ja: "ja",
  ko: "ko",
  "zh-CN": "zh",
  ar: "ar",
  hi: "hi",
  tr: "tr",
  pl: "pl",
  vi: "vi",
  id: "id",
  th: "th",
  sv: "sv",
  no: "nb",
  da: "da",
  uk: "uk",
  he: "he",
  el: "el",
};

function normalizeLanguageName(name: string): string {
  return name.trim().toLowerCase();
}

/**
 * Returns an ISO 639-1 code for Google Translate, or null if unknown.
 */
export function languageNameToTranslateCode(
  languageName: string,
): string | null {
  const key = normalizeLanguageName(languageName);
  if (!key) return null;
  if (LANGUAGE_NAME_TO_CODE[key]) return LANGUAGE_NAME_TO_CODE[key]!;
  // "Chinese (Mandarin)" and other presets normalize via map; try first token.
  const first = key.split(/[\s(,/-]+/)[0];
  if (first && LANGUAGE_NAME_TO_CODE[first]) {
    return LANGUAGE_NAME_TO_CODE[first]!;
  }
  return null;
}

/** BCP 47-ish locale for Intl.Segmenter word boundaries. */
export function languageNameToSegmenterLocale(
  languageName?: string,
): string | undefined {
  const code = languageName?.trim()
    ? languageNameToTranslateCode(languageName)
    : null;
  if (!code) return undefined;
  return SEGMENTER_LOCALE[code] ?? code.split("-")[0];
}
