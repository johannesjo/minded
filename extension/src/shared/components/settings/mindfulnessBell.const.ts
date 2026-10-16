/** Mirrors MindfulnessBellSchedule.DEFAULT_SLOTS_PER_DAY. */
export const DEFAULT_BELL_PER_DAY = 2;

/**
 * Mirror MindfulnessBellSchedule.SLOTS_PER_DAY_RANGE. Wide for now, so the
 * bell can be tried out often; one to three are the everyday choices.
 */
export const BELL_PER_DAY_MIN = 1;
export const BELL_PER_DAY_MAX = 30;

export const bellPerDayLabel = (n: number): string =>
  n === 1 ? "Once a day" : n === 2 ? "Twice a day" : `${n} times a day`;
