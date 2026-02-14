export const citationRegex = /(\[[0-9]+(?:[\-–][0-9]+)?(?:\s*,\s*[0-9]+(?:[\-–][0-9]+)?)*\]|\([0-9]+(?:\s*,\s*[0-9]+)*\))/g;

export function findCitations(input: string): Array<{ start: number; end: number; text: string }> {
  const out: Array<{ start: number; end: number; text: string }> = [];
  for (const match of input.matchAll(citationRegex)) {
    if (match.index === undefined) continue;
    out.push({ start: match.index, end: match.index + match[0].length, text: match[0] });
  }
  return out;
}
