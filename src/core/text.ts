/**
 * Word wrap by code point count (JetBrains Mono is monospaced).
 * Allocates: call at state entry, not per frame.
 */
export function wrap(text: string, maxChars: number): string[] {
  if (maxChars < 1) throw new RangeError("maxChars must be >= 1");
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const wl = Array.from(word).length;
    const ll = Array.from(line).length;
    if (ll === 0) {
      line = word;
    } else if (ll + 1 + wl <= maxChars) {
      line += " " + word;
    } else {
      lines.push(line);
      line = word;
    }
    // hard-split words longer than a line
    while (Array.from(line).length > maxChars) {
      const pts = Array.from(line);
      lines.push(pts.slice(0, maxChars).join(""));
      line = pts.slice(maxChars).join("");
    }
  }
  if (line) lines.push(line);
  return lines;
}
