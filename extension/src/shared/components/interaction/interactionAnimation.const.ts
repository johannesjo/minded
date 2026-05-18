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
     * Intent/time option buttons are actionable as soon as they are visible.
     * A delayed arming window makes quick taps look focused/hovered while the
     * click handler still returns before selecting.
     */
    armWindow: 0,
  },
} as const;

export type AnimationTimingKey = keyof typeof ANIMATION_TIMING;
