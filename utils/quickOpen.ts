/**
 * Ranking for the quick-open list. Matching is subsequence-based so `dgd` finds
 * `docs/guide.md`, and the score prefers matches that are contiguous, land on
 * the file name, and start at a word boundary.
 */
export interface QuickOpenCandidate {
  path: string;
  name: string;
}

const isBoundary = (target: string, index: number) => {
  if (index === 0) return true;
  const previous = target[index - 1] ?? "";
  return previous === "/" || previous === "-" || previous === "_" || previous === ".";
};

/** Returns a score for the match, or `null` when the query does not fit. */
export const scoreQuickOpen = (query: string, target: string): number | null => {
  const needle = query.trim().toLowerCase();
  if (!needle) return 0;

  const haystack = target.toLowerCase();
  let score = 0;
  let cursor = 0;
  let previousIndex = -2;

  for (const character of needle) {
    const index = haystack.indexOf(character, cursor);
    if (index === -1) return null;

    if (index === previousIndex + 1) score += 6;
    if (isBoundary(haystack, index)) score += 4;
    score += 1;

    previousIndex = index;
    cursor = index + 1;
  }

  // Shorter paths with the match late in the string are usually the file name.
  return score - target.length * 0.05;
};

export const rankQuickOpen = <T extends QuickOpenCandidate>(
  candidates: T[],
  query: string,
  limit = 20,
): T[] => {
  if (!query.trim()) return candidates.slice(0, limit);

  const scored: { item: T; score: number }[] = [];
  for (const item of candidates) {
    const nameScore = scoreQuickOpen(query, item.name);
    const pathScore = scoreQuickOpen(query, item.path);
    if (nameScore === null && pathScore === null) continue;
    // A hit on the file name outranks the same hit buried in a directory path.
    scored.push({
      item,
      score: Math.max(nameScore === null ? -Infinity : nameScore + 8, pathScore ?? -Infinity),
    });
  }

  return scored
    .sort((a, b) => b.score - a.score || (a.item.path < b.item.path ? -1 : 1))
    .slice(0, limit)
    .map((entry) => entry.item);
};
