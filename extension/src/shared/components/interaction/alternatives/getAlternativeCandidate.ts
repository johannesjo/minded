import type { Alternative } from "@src/dataInterface/syncData";

const RECENT_ALTERNATIVE_SHOWN_WINDOW_MS = 12 * 60 * 60 * 1000;

export interface AlternativeCandidateOptions {
  now?: number;
  random?: () => number;
}

const getAlternativeScore = (alternative: Alternative, now: number): number => {
  const recentShownPenalty =
    alternative.lastShownTS !== undefined &&
    now - alternative.lastShownTS < RECENT_ALTERNATIVE_SHOWN_WINDOW_MS
      ? 6
      : 0;

  return (
    10 +
    alternative.openedCount * 3 -
    alternative.dismissedCount * 4 -
    recentShownPenalty
  );
};

export const getAlternativeCandidate = (
  alternatives: Alternative[],
  options: AlternativeCandidateOptions = {},
): Alternative | undefined => {
  const now = options.now ?? Date.now();
  const random = options.random ?? Math.random;
  const scored = alternatives
    .filter((alternative) => alternative.disabledTS === undefined)
    .map((alternative) => ({
      alternative,
      score: getAlternativeScore(alternative, now),
      tieBreaker: random(),
    }));

  if (scored.length === 0) {
    return undefined;
  }

  return scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.tieBreaker - b.tieBreaker;
  })[0].alternative;
};

export const getNextAlternativeCandidate = (
  alternatives: Alternative[],
  currentAlternativeId: string,
  options: AlternativeCandidateOptions = {},
): Alternative | undefined =>
  getAlternativeCandidate(
    alternatives.filter(
      (alternative) => alternative.id !== currentAlternativeId,
    ),
    options,
  );
