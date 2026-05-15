/**
 * Centralized animation timing constants for interaction components.
 * Consolidates magic numbers into a single source of truth.
 */

export const ANIMATION_TIMING = {
  /** Fade out animation durations in milliseconds */
  fadeOut: {
    standard: 1000,
    fast: 700,
    wrapper: 5000,
  },

  /** Delays before various actions in milliseconds */
  delay: {
    initFadeOut: 200,
    contentReady: 100,
    beProudMessage: 1000,
    sunInstructionsFadeIn: 600,
    wrapperFadeStart: 2000,
    /**
     * How long intent/time option buttons stay pointer-events:none after
     * the screen appears (anti-reflex "arming"). Kept shorter than the
     * SCREEN_TRANSITION_MS fade so an early tap isn't silently swallowed
     * for the full second.
     */
    armWindow: 750,
  },
} as const;

export type AnimationTimingKey = keyof typeof ANIMATION_TIMING;
