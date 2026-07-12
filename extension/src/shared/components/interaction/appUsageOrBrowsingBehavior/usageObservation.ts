import { getIsoDate } from "@src/util/getIsoDate";
import {
  DailyUsageStat,
  UsageStatsByDate,
} from "@src/shared/components/interaction/appUsageOrBrowsingBehavior/usageStats";

/** A single thing the user spent time on today (a site host or an app). */
export interface UsageTarget {
  id: string;
  label: string;
  seconds: number;
}

/**
 * A present-moment, judgment-free read of actual usage — the replacement for
 * the Great→Awful self-rating. Deliberately carries NO baseline/"usual by now"
 * comparison: comparing today against a personal average is the grammar of a
 * tracker ("am I ahead or behind?") and fails the no-judgment bar. Today's
 * observed fact only — no good/bad, no trend, no chart.
 */
export interface UsageObservation {
  todaySeconds: number;
  topTargets: UsageTarget[];
}

/** Need at least this much usage today before an observation is worth showing. */
export const MIN_OBSERVATION_SECONDS = 60;
/** Most targets to surface in the copy (keeps the line short and calm). */
export const MAX_OBSERVATION_TARGETS = 3;

/**
 * Format observed seconds as a calm, rounded, human duration ("about 25 min",
 * "1 h 10 min"). Deliberately coarse — this is a soft awareness cue, not a
 * precise stopwatch.
 */
export const formatUsageDuration = (seconds: number): string => {
  if (!Number.isFinite(seconds) || seconds < 0) return "less than a minute";
  const totalMinutes = Math.round(seconds / 60);
  if (totalMinutes < 1) return "less than a minute";
  if (totalMinutes < 60) return `${totalMinutes} min`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes > 0 ? `${hours} h ${minutes} min` : `${hours} h`;
};

const sum = (nums: number[]): number => nums.reduce((acc, n) => acc + n, 0);

const dayTotal = (day: DailyUsageStat): number =>
  sum(Object.values(day.perSite ?? {}));

/**
 * Build the present-moment usage observation from stored daily stats.
 *
 * `labelFor` resolves a target id (host or package name) to a human label.
 */
export const computeUsageObservation = (
  stats: UsageStatsByDate,
  now = Date.now(),
  labelFor: (id: string) => string = (id) => id,
): UsageObservation => {
  const today = getIsoDate(new Date(now));

  const todayStat = stats[today];
  const todaySeconds = todayStat ? dayTotal(todayStat) : 0;

  const topTargets: UsageTarget[] = todayStat
    ? Object.entries(todayStat.perSite ?? {})
        .filter(([, seconds]) => seconds > 0)
        .sort(([, a], [, b]) => b - a)
        .slice(0, MAX_OBSERVATION_TARGETS)
        .map(([id, seconds]) => ({ id, label: labelFor(id), seconds }))
    : [];

  return { todaySeconds, topTargets };
};
