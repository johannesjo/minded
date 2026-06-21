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
 * the Great→Awful self-rating. `baselineSeconds` is "usual by this time of day"
 * (null when there isn't enough history to say so honestly). No good/bad, no
 * trend, no chart.
 */
export interface UsageObservation {
  todaySeconds: number;
  baselineSeconds: number | null;
  topTargets: UsageTarget[];
}

/** Need at least this much usage today before an observation is worth showing. */
export const MIN_OBSERVATION_SECONDS = 60;
/** Only build a baseline from at least this many prior days (else it's noise). */
export const MIN_BASELINE_DAYS = 3;
/** Don't reach further back than this for the baseline — keep it *recent*. */
export const BASELINE_LOOKBACK_DAYS = 14;
/** Most targets to surface in the copy (keeps the line short and calm). */
export const MAX_OBSERVATION_TARGETS = 3;

/**
 * Format observed seconds as a calm, rounded, human duration ("about 25 min",
 * "1 h 10 min"). Deliberately coarse — this is a soft awareness cue, not a
 * precise stopwatch.
 */
export const formatUsageDuration = (seconds: number): string => {
  const totalMinutes = Math.round(seconds / 60);
  if (totalMinutes < 1) return "less than a minute";
  if (totalMinutes < 60) return `${totalMinutes} min`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes > 0 ? `${hours} h ${minutes} min` : `${hours} h`;
};

const sum = (nums: number[]): number => nums.reduce((acc, n) => acc + n, 0);

const cumulativeThroughHour = (day: DailyUsageStat, hour: number): number =>
  sum((day.byHour ?? []).slice(0, hour + 1));

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
  const date = new Date(now);
  const today = getIsoDate(date);
  const hour = date.getHours();

  const todayStat = stats[today];
  const todaySeconds = todayStat ? dayTotal(todayStat) : 0;

  const topTargets: UsageTarget[] = todayStat
    ? Object.entries(todayStat.perSite ?? {})
        .filter(([, seconds]) => seconds > 0)
        .sort(([, a], [, b]) => b - a)
        .slice(0, MAX_OBSERVATION_TARGETS)
        .map(([id, seconds]) => ({ id, label: labelFor(id), seconds }))
    : [];

  const cutoff = getIsoDate(
    new Date(now - BASELINE_LOOKBACK_DAYS * 24 * 60 * 60 * 1000),
  );
  const priorCumulatives = Object.keys(stats)
    .filter((d) => d < today && d >= cutoff)
    .map((d) => cumulativeThroughHour(stats[d], hour));

  const baselineSeconds =
    priorCumulatives.length >= MIN_BASELINE_DAYS
      ? Math.round(sum(priorCumulatives) / priorCumulatives.length)
      : null;

  return { todaySeconds, baselineSeconds, topTargets };
};
