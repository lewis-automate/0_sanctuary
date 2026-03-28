/**
 * User-facing instruction for Gemini (collocation + JSON shape).
 * Replaces N8N {{ $('USERSELECTED').item.json.* }} with resolved languages.
 */
export function buildFiveSentencesUserPrompt(params: {
  targetLanguage: string;
  nativeLanguage: string;
  vocab: string;
}): string {
  const { targetLanguage, nativeLanguage, vocab } = params;
  return `I will give a ${targetLanguage} collocation for a ${nativeLanguage} person learning ${targetLanguage}. Example sentences are to be short and to the point, to keep the focus on the new words.

The collocation is:
"${vocab.replace(/"/g, '\\"')}"

Produce a JSON object with exactly this structure (all string values):

- "explanation": 1–5 sentences in ${nativeLanguage} explaining the difficulty or a useful tip for learning this phrase or grammar pattern as a ${nativeLanguage}-speaking learner of ${targetLanguage}.

- "dissected": translate each word or meaningful chunk of the collocation separately (word → gloss) so the learner sees how the pieces fit. Use ${nativeLanguage} for glosses. Keep it concise.

- "sentences": an array of exactly 5 objects. Each object has:
  - "sentence": a short example in ${targetLanguage} using the collocation naturally.
  - "reference": a short note in ${nativeLanguage} tying the example to the explanation (can be an empty string "" for items 3–5 if you prefer less repetition, but the field must be present).

Return ONLY valid JSON, no markdown fences, no other keys.`;
}
