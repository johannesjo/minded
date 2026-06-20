import type { PatternInsightState } from "@src/dataInterface/syncData";
import type { InteractionContext } from "@src/shared/components/interaction/interactionContext";

export type PatternInsightAction =
  | "still_on_purpose"
  | "show_alternative"
  | "leave_now";

export interface PatternInsight {
  id: string;
  dateISO: string;
  message: string;
  actions: PatternInsightAction[];
}

const MAX_SHOWN_DATE_BUCKETS = 60;
// How many recent returns (sun taps inside the ~5h window, see sunTapHistory.ts)
// it takes before we gently name the loop. The current visit isn't counted yet
// at decision time, so 3 prior returns means the user is here for at least the
// fourth time — a real, observed pull, not a fluke.
const RETURN_LOOP_MIN_RECENT_SUN_TAPS = 3;

const getShownInsightIdsForDate = (
  state: PatternInsightState | undefined,
  dateISO: string,
): string[] => state?.shownInsightIdsByDate?.[dateISO] ?? [];

export const hasPatternInsightShownToday = (
  state: PatternInsightState | undefined,
  insightId: string,
  dateISO: string,
): boolean => getShownInsightIdsForDate(state, dateISO).includes(insightId);

export const markPatternInsightShownInState = (
  state: PatternInsightState | undefined,
  insightId: string,
  dateISO: string,
): PatternInsightState => {
  const shownForDate = getShownInsightIdsForDate(state, dateISO);
  const shownInsightIdsByDate = {
    ...(state?.shownInsightIdsByDate ?? {}),
    [dateISO]: shownForDate.includes(insightId)
      ? shownForDate
      : [...shownForDate, insightId],
  };
  const retainedDateKeys = Array.from(
    new Set([dateISO, ...Object.keys(shownInsightIdsByDate).sort().reverse()]),
  ).slice(0, MAX_SHOWN_DATE_BUCKETS);

  return retainedDateKeys.reduce<PatternInsightState>(
    (nextState, retainedDateKey) => ({
      shownInsightIdsByDate: {
        ...nextState.shownInsightIdsByDate,
        [retainedDateKey]: shownInsightIdsByDate[retainedDateKey],
      },
    }),
    { shownInsightIdsByDate: {} },
  );
};

const getActions = (context: InteractionContext): PatternInsightAction[] =>
  context.hasAlternatives
    ? ["still_on_purpose", "show_alternative", "leave_now"]
    : ["still_on_purpose", "leave_now"];

const createInsight = (
  context: InteractionContext,
  id: string,
  message: string,
): PatternInsight => ({
  id,
  dateISO: context.dateISO,
  message,
  actions: getActions(context),
});

const getInsightCandidates = (
  context: InteractionContext,
): PatternInsight[] => {
  const candidates: PatternInsight[] = [];

  // Present-session return loop — currently the only pattern insight. It is the
  // one noticing that is true by observation, not inference: we counted these
  // returns ourselves and they are happening now. It is not target-scoped (it
  // reflects the whole recent session) and works on every platform. The count
  // is left vague ("a few times") on purpose — a gentle noticing, never a tally
  // to beat. Candidate selection has no fall-through (see
  // getPatternInsightCandidate), so once shown it is intentionally suppressed
  // for the rest of the day while it stays eligible.
  if (context.recentSunTaps >= RETURN_LOOP_MIN_RECENT_SUN_TAPS) {
    candidates.push(
      createInsight(
        context,
        "return-loop",
        "You've come back a few times in a short while. That's okay — see if you can just notice the pull, without having to act on it.",
      ),
    );
  }

  return candidates;
};

export const getPatternInsightCandidate = (
  context: InteractionContext,
  state?: PatternInsightState,
): PatternInsight | undefined => {
  const topCandidate = getInsightCandidates(context)[0];
  if (
    !topCandidate ||
    hasPatternInsightShownToday(state, topCandidate.id, topCandidate.dateISO)
  ) {
    return undefined;
  }

  return topCandidate;
};

export const getPatternInsightActionLabel = (
  action: PatternInsightAction,
): string => {
  switch (action) {
    case "still_on_purpose":
      return "Still on purpose";
    case "show_alternative":
      return "Show alternative";
    case "leave_now":
      return "Leave now";
  }
};
