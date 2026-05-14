import { SleepWindDownCfg, TimeRange } from "@src/dataInterface/syncData";
import { getIsoDate } from "@src/util/getIsoDate";

/**
 * Parse a `HH:MM` 24-hour string into minutes-of-day. Returns NaN for any
 * malformed input — callers must treat NaN as "no window" rather than
 * silently propagating it through comparisons.
 */
const parseHHMM = (s: string): number => {
  if (typeof s !== "string") return NaN;
  const m = /^(\d{1,2}):(\d{2})$/.exec(s.trim());
  if (!m) return NaN;
  const h = parseInt(m[1], 10);
  const mm = parseInt(m[2], 10);
  if (h < 0 || h > 23 || mm < 0 || mm > 59) return NaN;
  return h * 60 + mm;
};

/**
 * Resolves the "night id" for a given moment — the ISO date of the day on which
 * the wind-down window started. If now is past midnight but still before wake,
 * the night id is yesterday's date.
 *
 * Returns null if the given moment is not inside any configured wind-down window.
 */
export const resolveNightId = (
  cfg: SleepWindDownCfg,
  at: Date = new Date(),
): string | null => {
  if (!cfg.enabled) return null;

  const minutesNow = at.getHours() * 60 + at.getMinutes();
  const todayIdx = at.getDay();
  const todayRange = cfg.days[todayIdx];

  // Window starting today (e.g. 22:00 today -> 07:00 tomorrow, or 22:00 -> 23:30 same day)
  if (todayRange) {
    const start = parseHHMM(todayRange.start);
    const end = parseHHMM(todayRange.end);
    if (Number.isFinite(start) && Number.isFinite(end) && start !== end) {
      if (end > start) {
        // Same-day window
        if (minutesNow >= start && minutesNow < end) {
          return getIsoDate(at);
        }
      } else {
        // Crosses midnight — only the "after start" half belongs to today's nightId
        if (minutesNow >= start) {
          return getIsoDate(at);
        }
      }
    }
  }

  // Window that started yesterday and crosses midnight into today
  const yesterday = new Date(at);
  yesterday.setDate(at.getDate() - 1);
  const yIdx = yesterday.getDay();
  const yRange = cfg.days[yIdx];
  if (yRange) {
    const start = parseHHMM(yRange.start);
    const end = parseHHMM(yRange.end);
    if (
      Number.isFinite(start) &&
      Number.isFinite(end) &&
      end < start &&
      minutesNow < end
    ) {
      return getIsoDate(yesterday);
    }
  }

  return null;
};

export const isInsideWindow = (
  cfg: SleepWindDownCfg,
  at: Date = new Date(),
): boolean => resolveNightId(cfg, at) !== null;

export const SNOOZE_MINUTES = 15;

/**
 * Maps a `nightId` string ("YYYY-MM-DD") to a stable index in `[0, length)`.
 * Used to pick rotating content (e.g. calm-read passage) deterministically per
 * night — same passage all night, different across nights.
 *
 * Returns 0 for empty inputs or zero-length pools.
 */
export const nightIdToIndex = (nightId: string, length: number): number => {
  if (length <= 0) return 0;
  let sum = 0;
  for (let i = 0; i < nightId.length; i++) sum += nightId.charCodeAt(i);
  return sum % length;
};

/** Empty range used when the user has no schedule yet but enables a day. */
export const DEFAULT_DAY_RANGE: TimeRange = { start: "22:00", end: "07:00" };
