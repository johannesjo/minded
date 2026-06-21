import { getIsoDate } from "@src/util/getIsoDate";

/**
 * Observed usage for a single day. `byHour` holds seconds accrued in each local
 * hour (index 0–23, across all tracked hosts); `perSite` holds the per-host
 * totals for that day. We keep both so we can show *what* was used today
 * (`perSite`) and compute an honest "usual by this time of day" baseline from
 * the hour buckets — never a stale daily total.
 *
 * This is observed behaviour only (real foreground time), the present-moment
 * replacement for the old Great→Awful self-rating. It is intentionally NOT
 * charted over time (no scoreboard / trend graph).
 */
export interface DailyUsageStat {
  perSite: { [host: string]: number };
  byHour: number[];
}

export type UsageStatsByDate = { [dateISO: string]: DailyUsageStat };

/** Keep at most this many recent days so the store can't grow unbounded. */
export const MAX_USAGE_STAT_DAYS = 30;

const HOURS_PER_DAY = 24;

const emptyDay = (): DailyUsageStat => ({
  perSite: {},
  byHour: new Array(HOURS_PER_DAY).fill(0),
});

/** Defensive: tolerate days persisted before `byHour` existed / malformed. */
const normalizeDay = (day: DailyUsageStat | undefined): DailyUsageStat => {
  if (!day) return emptyDay();
  const byHour = new Array(HOURS_PER_DAY).fill(0);
  if (Array.isArray(day.byHour)) {
    for (let h = 0; h < HOURS_PER_DAY; h++) {
      byHour[h] = day.byHour[h] || 0;
    }
  }
  return { perSite: { ...(day.perSite ?? {}) }, byHour };
};

const prune = (stats: UsageStatsByDate): UsageStatsByDate => {
  const keys = Object.keys(stats).sort().reverse();
  if (keys.length <= MAX_USAGE_STAT_DAYS) return stats;
  const kept: UsageStatsByDate = {};
  for (const key of keys.slice(0, MAX_USAGE_STAT_DAYS)) {
    kept[key] = stats[key];
  }
  return kept;
};

/**
 * Add `seconds` of observed foreground time on `host` to today's record.
 * Pure — returns the new map (pruned to recent days) to persist.
 */
export const addUsageTime = (
  stats: UsageStatsByDate,
  host: string,
  seconds: number,
  now = Date.now(),
): UsageStatsByDate => {
  if (seconds <= 0 || !host) return stats;
  const date = new Date(now);
  const today = getIsoDate(date);
  const hour = date.getHours();

  const day = normalizeDay(stats[today]);
  day.perSite[host] = (day.perSite[host] || 0) + seconds;
  day.byHour[hour] = (day.byHour[hour] || 0) + seconds;

  return prune({ ...stats, [today]: day });
};
