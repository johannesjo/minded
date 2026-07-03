/**
 * Centralized animation timing constants for interaction components.
 * Consolidates magic numbers into a single source of truth.
 */

export const ANIMATION_TIMING = {
  /** Fade out animation durations in milliseconds */
  fadeOut: {
    // Drives every intervention screen-to-screen fade (SCREEN_TRANSITION_MS).
    // Kept just above the sun's 650ms corner glide (GLIDE_DURATION_MS) so the
    // departing disc lands before the overlay hands off to the Little Sun.
    standard: 700,
    fast: 700,
    wrapper: 5000,
  },

  /** Delays before various actions in milliseconds */
  delay: {
    initFadeOut: 200,
    contentReady: 100,
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
