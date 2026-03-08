export type Story = {
  id: string;
  title: string;
  wordCount: number;
  language: string;
  difficulty: string;
  body: string;
};

export const stories: Story[] = [
  {
    id: "a-quiet-story",
    title: "A Quiet Story",
    wordCount: 1240,
    language: "Japanese",
    difficulty: "Beginner",
    body: [
      "The room was still, and the afternoon light pooled softly along the page. Outside, the city kept its distance—muted, patient, kind.",
      "You read slowly, letting each sentence settle. There was no rush here—only the steady rhythm of words, and the small comfort of understanding.",
      "Somewhere in the story, you found a familiar phrase again. This time it felt lighter, as if it belonged to you.",
    ].join("\n\n"),
  },
  {
    id: "morning-notes",
    title: "Morning Notes",
    wordCount: 860,
    language: "Spanish",
    difficulty: "Beginner",
    body: [
      "Morning arrived without hurry. The first cup of coffee waited beside your notebook, its steam folding gently into the air.",
      "You copied a short sentence from the page, then whispered it once, twice, three times. The language felt new, but the ritual felt safe.",
    ].join("\n\n"),
  },
  {
    id: "the-soft-city",
    title: "The Soft City",
    wordCount: 1735,
    language: "French",
    difficulty: "Intermediate",
    body: [
      "The city at dusk was quieter than you expected. Neon signs hummed softly, reflecting in puddles left behind by an afternoon shower.",
      "Every street name carried a small challenge, but also a small reward. With each corner turned, you recognized one more word.",
    ].join("\n\n"),
  },
];

export function getStoryById(id: string | undefined): Story {
  if (!id) return stories[0];
  return stories.find((story) => story.id === id) ?? stories[0];
}

