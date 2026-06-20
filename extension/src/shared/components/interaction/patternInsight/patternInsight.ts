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

const MIN_TARGET_USAGE_SECONDS = 15 * 60;
const BUDGET_NEAR_LIMIT_SECONDS = 5 * 60;
const MIN_BUDGET_USED_SECONDS = 5 * 60;
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

const formatMinutes = (seconds: number): string => {
  const minutes = Math.max(1, Math.ceil(seconds / 60));
  return `${minutes} minute${minutes === 1 ? "" : "s"}`;
};

const formatMinuteAdjective = (seconds: number): string =>
  `${Math.max(1, Math.ceil(seconds / 60))}-minute`;

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

const getScopedTargetId = (context: InteractionContext): string | undefined =>
  context.target?.kind === "host" ? context.target.id : undefined;

const getInsightCandidates = (
  context: InteractionContext,
): PatternInsight[] => {
  const candidates: PatternInsight[] = [];

  // Present-session return loop. The one noticing that is true by observation,
  // not inference: we counted these returns ourselves and they are happening
  // now. It is not target-scoped (it reflects the whole recent session) and
  // works on every platform, so it leads the list. The count is left vague
  // ("a few times") on purpose — a gentle noticing, never a tally to beat.
  // Because candidate selection has no fall-through (see getPatternInsightCandidate),
  // leading the list means that once shown it is intentionally the only insight
  // while it stays eligible that day: the gentler noticing takes precedence over
  // the usage/budget stats, which resurface once the loop lapses.
  if (context.recentSunTaps >= RETURN_LOOP_MIN_RECENT_SUN_TAPS) {
    candidates.push(
      createInsight(
        context,
        "return-loop",
        "You've come back a few times in a short while. That's okay — see if you can just notice the pull, without having to act on it.",
      ),
    );
  }

  const targetId = getScopedTargetId(context);
  if (!targetId) {
    return candidates;
  }

  if (context.budget.isActive && context.budget.isExhausted) {
    candidates.push(
      createInsight(
        context,
        `budget-exhausted:${targetId}`,
        `You've used today's ${formatMinuteAdjective(
          context.budget.totalBudgetSeconds,
        )} budget.`,
      ),
    );
  } else if (
    context.budget.isActive &&
    context.budget.usedSeconds >= MIN_BUDGET_USED_SECONDS &&
    context.budget.remainingSeconds > 0 &&
    context.budget.remainingSeconds <= BUDGET_NEAR_LIMIT_SECONDS
  ) {
    candidates.push(
      createInsight(
        context,
        `budget-near-limit:${targetId}`,
        `You have ${formatMinutes(
          context.budget.remainingSeconds,
        )} left in your budget today.`,
      ),
    );
  }

  if (context.targetUsageSeconds >= MIN_TARGET_USAGE_SECONDS) {
    candidates.push(
      createInsight(
        context,
        `daily-usage:${targetId}`,
        `You've spent ${formatMinutes(context.targetUsageSeconds)} here today.`,
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
