/**
 * The moon's phase from the date alone - the mean synodic month counted from a
 * known new moon. The real moon wanders up to ~14h either side of this mean,
 * which shifts the drawn terminator by a sliver nobody can see at the
 * companion's size; nothing here needs the full lunar theory.
 *
 * Pure: no clock, no DOM.
 */

export const SYNODIC_MONTH_DAYS = 29.530588853;
/** The new moon of 2000-01-06 18:14 UTC - the usual reference epoch. */
const REFERENCE_NEW_MOON_MS = Date.UTC(2000, 0, 6, 18, 14);
const DAY_MS = 86_400_000;

export type MoonPhase = {
  /** Position in the cycle, 0..1: 0 new, 0.25 first quarter, 0.5 full, 0.75 last quarter. */
  cycle: number;
  /** Lit fraction of the disc, 0..1. */
  illumination: number;
  /** True while the lit part grows (new → full). */
  isWaxing: boolean;
};

export const moonPhaseAt = (date: Date): MoonPhase => {
  const days = (date.getTime() - REFERENCE_NEW_MOON_MS) / DAY_MS;
  const age =
    ((days % SYNODIC_MONTH_DAYS) + SYNODIC_MONTH_DAYS) % SYNODIC_MONTH_DAYS;
  const cycle = age / SYNODIC_MONTH_DAYS;
  return {
    cycle,
    illumination: (1 - Math.cos(2 * Math.PI * cycle)) / 2,
    isWaxing: cycle < 0.5,
  };
};
