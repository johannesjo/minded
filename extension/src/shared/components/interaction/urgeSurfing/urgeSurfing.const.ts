import type { FrictionLevel } from "@src/shared/components/interaction/interactionContext";

/**
 * "Urge surfing": a mindfulness technique for working with cravings. Instead
 * of acting on the urge to open a distracting site, the user watches it rise,
 * crest and fall like a wave, noticing it change on its own. The stronger the
 * friction (i.e. the stronger the pull), the longer the wave we ride.
 */
const SURF_DURATION_MS_BY_FRICTION: Record<FrictionLevel, number> = {
  soft: 18_000,
  normal: 26_000,
  strong: 38_000,
};

export const getSurfDurationMs = (frictionLevel: FrictionLevel): number =>
  SURF_DURATION_MS_BY_FRICTION[frictionLevel];

/** Intensity steps offered before and after the wave. */
export const URGE_INTENSITY_STEPS = [1, 2, 3, 4, 5] as const;

/**
 * Guiding cues shown during the wave, keyed by how far through it we are.
 * Each entry applies until the next `untilFraction` threshold.
 */
export const SURF_CUES: ReadonlyArray<{ untilFraction: number; text: string }> =
  [
    { untilFraction: 0.25, text: "Notice where you feel it in your body." },
    {
      untilFraction: 0.5,
      text: "You don't have to push it away, just watch.",
    },
    {
      untilFraction: 0.75,
      text: "It's rising… and already starting to change.",
    },
    { untilFraction: 1.01, text: "Let it pass, like a wave." },
  ];

export const getSurfCue = (fraction: number): string =>
  (
    SURF_CUES.find((c) => fraction < c.untilFraction) ??
    SURF_CUES[SURF_CUES.length - 1]
  ).text;
