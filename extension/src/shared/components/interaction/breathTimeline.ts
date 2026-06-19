/**
 * One shared, pure model for breath-guided animations. The sun visual and the
 * cue copy both read their state from here, so they are computed from a single
 * formula and can't drift out of sync — the bug this module exists to kill.
 *
 * A breath is three phases — inhale → hold → exhale — and `fill` is the eased
 * fullness of the breath (0 = emptied/exhaled, 1 = full/inhaled). Map `fill` to
 * whatever the visual needs (a scale, an opacity); map `phase` to the cue copy.
 */

export type BreathPhaseName = "inhale" | "hold" | "exhale";

export interface BreathPattern {
  inhaleMs: number;
  holdMs: number;
  exhaleMs: number;
}

export interface BreathState {
  phase: BreathPhaseName;
  /** Eased breath fullness: 0 at full exhale (empty), 1 at peak inhale (full). */
  fill: number;
  /** Whole seconds left in the current phase, for a per-phase countdown. */
  phaseSecondsLeft: number;
  /** Time since the current phase began, in ms. */
  phaseElapsedMs: number;
  /** Time until the current phase ends, in ms. */
  phaseRemainingMs: number;
}

const clamp01 = (n: number): number => Math.max(0, Math.min(1, n));

// Eases the breath in and settles it gently at the turn rather than snapping.
// Named distinctly from sunAnimationUtils' (quadratic) easeInOut — this is the
// cosine breath curve, used only here.
const easeBreath = (p: number): number =>
  0.5 - 0.5 * Math.cos(Math.PI * clamp01(p));

export const breathCycleMs = (pattern: BreathPattern): number =>
  pattern.inhaleMs + pattern.holdMs + pattern.exhaleMs;

export const breathCycleSeconds = (pattern: BreathPattern): number =>
  Math.round(breathCycleMs(pattern) / 1000);

/**
 * The breath state at a moment in time. `loop` repeats the cycle (the wind-down
 * exercise); without it, time past the final exhale clamps to empty — the
 * single-breath intervention pause that ends on a full release.
 */
export const getBreathStateAt = (
  elapsedMs: number,
  pattern: BreathPattern,
  options: { loop?: boolean } = {},
): BreathState => {
  const cycle = breathCycleMs(pattern);
  const raw = Math.max(0, elapsedMs);
  const t = options.loop ? raw % cycle : Math.min(raw, cycle);

  const { inhaleMs, holdMs, exhaleMs } = pattern;
  const holdEnd = inhaleMs + holdMs;

  if (t < inhaleMs) {
    return {
      phase: "inhale",
      fill: easeBreath(t / inhaleMs),
      phaseSecondsLeft: Math.ceil((inhaleMs - t) / 1000),
      phaseElapsedMs: t,
      phaseRemainingMs: inhaleMs - t,
    };
  }
  if (t < holdEnd) {
    return {
      phase: "hold",
      fill: 1,
      phaseSecondsLeft: Math.ceil((holdEnd - t) / 1000),
      phaseElapsedMs: t - inhaleMs,
      phaseRemainingMs: holdEnd - t,
    };
  }
  return {
    phase: "exhale",
    fill: 1 - easeBreath((t - holdEnd) / exhaleMs),
    phaseSecondsLeft: Math.ceil((cycle - t) / 1000),
    phaseElapsedMs: t - holdEnd,
    phaseRemainingMs: cycle - t,
  };
};

/** Cross-fade window for the cue copy at each phase change. */
export const CUE_FADE_MS = 350;

/**
 * Opacity for the phase cue copy, so the current label fades fully out before
 * the next fades in: it dips to 0 right at each phase boundary and eases back to
 * 1 once the new phase is under way. Driven by the same clock as everything
 * else, so the fade lands exactly on the breath's turns.
 */
export const getCueOpacity = (
  state: BreathState,
  fadeMs: number = CUE_FADE_MS,
): number =>
  clamp01(Math.min(state.phaseElapsedMs, state.phaseRemainingMs) / fadeMs);

/**
 * Cue opacity with reduced-motion folded in: holds the copy steady at full
 * opacity when motion is reduced (the sun is frozen then, so a pulsing label
 * would be out of place), and otherwise cross-fades it via {@link getCueOpacity}.
 * One place for the choice both breath-paced flows used to inline.
 */
export const cueOpacity = (
  state: BreathState,
  reducedMotion: boolean,
  fadeMs: number = CUE_FADE_MS,
): number => (reducedMotion ? 1 : getCueOpacity(state, fadeMs));

/**
 * Intervention breath pause (strong friction): one full breath with a longer
 * exhale than inhale, and a held top. Calming, and — with three distinct phases
 * — the cue copy and the sun line up on legible beats instead of a single
 * continuous swing.
 */
export const BREATH_PAUSE_PATTERN: BreathPattern = {
  inhaleMs: 4000,
  holdMs: 2000,
  exhaleMs: 6000,
};

/** Sleep wind-down exercise: the classic 4-7-8 relaxing breath, looped. */
export const WIND_DOWN_PATTERN: BreathPattern = {
  inhaleMs: 4000,
  holdMs: 7000,
  exhaleMs: 8000,
};

/**
 * Urge-surfing wave: a gentle 5s symmetric pulse with no held top, looped, that
 * rides the swell of a craving and lets it pass. Symmetric (no hold) so it reads
 * as a continuous rise-and-fall rather than the paused, three-beat intervention
 * breath.
 */
export const SURF_WAVE_PATTERN: BreathPattern = {
  inhaleMs: 2500,
  holdMs: 0,
  exhaleMs: 2500,
};
