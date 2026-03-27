/**
 * Read a JSON string value for `field` from model output, tolerating truncation
 * (no closing quote) so we still recover partial text when MAX_TOKENS cuts mid-string.
 */
export function extractJsonObjectStringField(raw: string, field: string): string {
  const re = new RegExp(`"${field}"\\s*:\\s*"`, "m");
  const m = re.exec(raw);
  if (!m || m.index === undefined) return "";
  let i = m.index + m[0].length;
  let out = "";
  while (i < raw.length) {
    const c = raw[i]!;
    if (c === "\\") {
      const n = raw[i + 1];
      if (n === "n") {
        out += "\n";
        i += 2;
        continue;
      }
      if (n === "r") {
        out += "\r";
        i += 2;
        continue;
      }
      if (n === "t") {
        out += "\t";
        i += 2;
        continue;
      }
      if (n === '"' || n === "\\" || n === "/") {
        out += n;
        i += 2;
        continue;
      }
      if (n === "u" && /^[0-9a-fA-F]{4}/.test(raw.slice(i + 2, i + 6))) {
        out += String.fromCharCode(parseInt(raw.slice(i + 2, i + 6), 16));
        i += 6;
        continue;
      }
      out += c;
      i += 1;
      continue;
    }
    if (c === '"') break;
    out += c;
    i += 1;
  }
  return out.trim();
}

/** Cap context sent to Gemini so long paragraphs do not starve output budget. */
export function truncatePromptContext(context: string, maxChars: number): string {
  const t = context.trim();
  if (t.length <= maxChars) return t;
  const head = Math.floor(maxChars * 0.55);
  const tail = maxChars - head - 1;
  return `${t.slice(0, head)}…${t.slice(-tail)}`;
}
