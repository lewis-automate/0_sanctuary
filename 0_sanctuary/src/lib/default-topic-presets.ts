export type DefaultTopicPreset = {
  id: string;
  title: string;
  body: string;
};

export type DefaultTopicCategory = {
  id: string;
  heading: string;
  presets: readonly DefaultTopicPreset[];
};

/** Curated defaults for “Pick default” — grouped by theme (no duplicates). */
export const DEFAULT_TOPIC_CATEGORIES: readonly DefaultTopicCategory[] = [
  {
    id: "analytical",
    heading: "Analytical (Intellectual & Deep)",
    presets: [
      {
        id: "concept-contrast",
        title: "Concept Contrast",
        body:
          "An in-depth comparison between two competing ideas, philosophies, or social theories.",
      },
      {
        id: "deep-dive",
        title: "Deep Dive",
        body:
          'A single philosophical point or "big idea" explored below the surface to reveal interesting truths.',
      },
      {
        id: "psychological-lens",
        title: "Psychological Lens",
        body:
          "An analysis of a common human behavior, habit, or social quirk through a scientific or mental health lens.",
      },
      {
        id: "systems-breakdown",
        title: "Systems Breakdown",
        body:
          'A "behind the scenes" look at how a specific industry, infrastructure, or complex global system actually works.',
      },
      {
        id: "analogy-theory",
        title: "Analogy Theory",
        body:
          "A complex scientific, technical, or economic theory explained using a simple, relatable real-world analogy.",
      },
      {
        id: "perspective-shift",
        title: "Perspective Shift",
        body:
          "A critical look at a modern trend or social norm, focusing on the hidden pros and cons nobody talks about.",
      },
      {
        id: "what-if-history",
        title: "What If? History",
        body:
          "A speculative scenario exploring how one small change in the past would have radically altered the world today.",
      },
      {
        id: "mindset-shift",
        title: "Mindset Shift",
        body:
          'A short, comforting take on a classic psychological hurdle like "Decision Fatigue," "Imposter Syndrome," or the "Fear of Starting."',
      },
    ],
  },
  {
    id: "cultural",
    heading: "Cultural (World & Tradition)",
    presets: [
      {
        id: "cultural-perspective",
        title: "Cultural Perspective",
        body:
          "An interesting point of view, cultural nuance, or historical deep dive specifically related to a specific countries life and society.",
      },
      {
        id: "untranslatable",
        title: "Untranslatable",
        body:
          "An exploration of a word from another language that describes a universal feeling with no direct translation into {{ nativeLanguage }}.",
      },
      {
        id: "forgotten-craft",
        title: "Forgotten Craft",
        body:
          "A step-by-step narrative guide to an ancient or manual craft (e.g., blacksmithing, traditional weaving, breadmaking).",
      },
      {
        id: "modern-mythology",
        title: "Modern Mythology",
        body:
          "A well-known folk tale, legend, or myth retold in a grounded, modern-day setting.",
      },
      {
        id: "mythology",
        title: "Mythology",
        body: "A well-known folk tale, legend, or myth retold.",
      },
      {
        id: "mystery-investigation",
        title: "Mystery Investigation",
        body:
          "A narrative look into a strange, real-world natural phenomenon or a fascinating local urban legend.",
      },
    ],
  },
  {
    id: "immersive",
    heading: "Immersive (Narrative & Sensory)",
    presets: [
      {
        id: "non-human-perspective",
        title: "Non-Human Perspective",
        body:
          'A "day in the life" of an animal, narrated through its unique physical senses.',
      },
      {
        id: "sensory-tour",
        title: "Sensory Tour",
        body:
          "A descriptive journey through a specific location (a market, a forest, a workshop) focusing entirely on sounds, smells, and atmosphere.",
      },
      {
        id: "object-biography",
        title: "Object's Biography",
        body:
          "Following a single item (like a specific coin, a vintage watch, or a letter) through decades of history and different owners.",
      },
      {
        id: "internal-monologue",
        title: "Internal Monologue",
        body:
          "A character-driven story about a person facing a relatable, low-stakes social dilemma or personal choice.",
      },
      {
        id: "quiet-dialogue",
        title: "Quiet Dialogue",
        body:
          "A scene between two people with opposing worldviews meeting in a peaceful, neutral setting to talk.",
      },
      {
        id: "speculative-travelogue",
        title: "Speculative Travelogue",
        body:
          "A log from a fictional, historical, or future destination focusing on the mundane, everyday details of life there.",
      },
    ],
  },
  {
    id: "constructive",
    heading: "Constructive (Recent & Positive)",
    presets: [
      {
        id: "weekly-win",
        title: "Weekly Win",
        body:
          "A summary of one major positive breakthrough in science, environment, or humanity that happened within the last few weeks.",
      },
      {
        id: "nature-rebounding",
        title: "Nature Rebounding",
        body:
          "A report on a specific ecosystem, forest, or animal species making a surprising ecological comeback right now.",
      },
    ],
  },
];

const TARGET_LANG_TOKEN = "{Target Language}";
const NATIVE_LANG_TOKEN = "{{ nativeLanguage }}";

function applyTargetLanguage(template: string, lang: string): string {
  return template.replaceAll(TARGET_LANG_TOKEN, lang);
}

function applyNativeLanguage(template: string, nativeLanguage: string): string {
  return template.replaceAll(NATIVE_LANG_TOKEN, nativeLanguage);
}

function resolveNativeLanguageForTopicPicker(nativeLanguage: string): string {
  const t = nativeLanguage.trim();
  return t || "your native language";
}

function mapCategoryPresetsWithNativeLanguage(
  category: DefaultTopicCategory,
  nativeLanguage: string,
): DefaultTopicCategory {
  const resolved = resolveNativeLanguageForTopicPicker(nativeLanguage);
  return {
    ...category,
    presets: category.presets.map((p) => ({
      ...p,
      title: applyNativeLanguage(p.title, resolved),
      body: applyNativeLanguage(p.body, resolved),
    })),
  };
}

/** Five presets tailored to the learner’s target language (settings). Omitted when target language is blank. */
export function buildExplorerTopicCategory(
  targetLanguage: string,
): DefaultTopicCategory | null {
  const lang = targetLanguage.trim();
  if (!lang) return null;

  const fill = (s: string) => applyTargetLanguage(s, lang);

  return {
    id: "explorer",
    heading: `Explorer (${lang} Focus)`,
    presets: [
      {
        id: "explorer-etiquette-nuance",
        title: fill("{Target Language} Etiquette & Nuance"),
        body: fill(
          'A guide to the "unwritten rules" of social interaction within {Target Language} speaking cultures (e.g., levels of formality or social cues).',
        ),
      },
      {
        id: "explorer-cultural-point",
        title: fill("{Target Language} Cultural Point"),
        body: fill(
          "A deep dive into a specific cultural phenomenon, holiday, or social trend unique to {Target Language} speaking regions.",
        ),
      },
      {
        id: "explorer-off-beaten-path",
        title: fill("{Target Language} Off-the-Beaten-Path"),
        body: fill(
          'A travel log focusing on a hidden gem or a "locals-only" spot in a region where {Target Language} is the primary tongue.',
        ),
      },
      {
        id: "explorer-regional-history",
        title: fill("{Target Language} Regional History"),
        body: fill(
          "A narrative look at a pivotal moment or a fascinating figure from the history of {Target Language} speaking countries.",
        ),
      },
      {
        id: "explorer-language-evolution",
        title: fill("{Target Language} Language Evolution"),
        body: fill(
          "An exploration of how {Target Language} is changing today—looking at modern slang, new loanwords, or digital communication styles.",
        ),
      },
    ],
  };
}

const STATIC_CATEGORY_ORDER = [
  "cultural",
  "analytical",
  "immersive",
  "constructive",
] as const;

/** Explorer first (when target language is set), then Cultural → Analytical → Immersive → Constructive. */
export function getDefaultTopicCategoriesForUser(
  targetLanguage: string,
  nativeLanguage: string,
): readonly DefaultTopicCategory[] {
  const byId = new Map(
    DEFAULT_TOPIC_CATEGORIES.map((c) => [c.id, c] as const),
  );
  const staticOrdered: DefaultTopicCategory[] = [];
  for (const id of STATIC_CATEGORY_ORDER) {
    const cat = byId.get(id);
    if (cat) {
      staticOrdered.push(mapCategoryPresetsWithNativeLanguage(cat, nativeLanguage));
    }
  }

  const explorer = buildExplorerTopicCategory(targetLanguage);
  if (!explorer) {
    return staticOrdered;
  }
  return [explorer, ...staticOrdered];
}

export function findDefaultTopicPresetInCategories(
  id: string,
  categories: readonly DefaultTopicCategory[],
): DefaultTopicPreset | undefined {
  for (const cat of categories) {
    const hit = cat.presets.find((p) => p.id === id);
    if (hit) return hit;
  }
  return undefined;
}

export function getDefaultTopicPresetFullText(
  preset: DefaultTopicPreset,
  maxLength: number,
): string {
  return `${preset.title}: ${preset.body}`.slice(0, maxLength);
}
