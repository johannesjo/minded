/**
 * Pure evaluation for the "Screen-Off Minute" intervention.
 *
 * Detection is timestamp-based on purpose: a JS timer cannot be trusted to
 * keep ticking while the Android WebView is backgrounded, but `Date.now()`
 * (wall clock) keeps advancing across screen-off and device sleep. So we only
 * compare the moment the page became hidden with the moment it became visible
 * again — never a counter that ran while hidden.
 */

/** How long the phone must stay locked/away to count as a success. */
export const SCREEN_OFF_TARGET_MS = 60_000;

export interface ScreenOffEvalInput {
  /** `Date.now()` captured when the page became hidden. */
  hiddenAt: number;
  /** `Date.now()` captured when the page became visible again. */
  shownAt: number;
  /** Required away duration in ms. */
  targetMs: number;
}

export interface ScreenOffEvalResult {
  /** Continuous away duration of this single segment, clamped to >= 0. */
  elapsedMs: number;
  /** How much longer the user would have needed to stay away. */
  remainingMs: number;
  /** Whether this single away segment met the target. */
  success: boolean;
}

/**
 * Evaluates one contiguous away segment. A successful screen-off must be a
 * single continuous lock — segments are intentionally not summed.
 */
export const evaluateScreenOff = ({
  hiddenAt,
  shownAt,
  targetMs,
}: ScreenOffEvalInput): ScreenOffEvalResult => {
  const elapsedMs = Math.max(0, shownAt - hiddenAt);
  const remainingMs = Math.max(0, targetMs - elapsedMs);

  return {
    elapsedMs,
    remainingMs,
    success: elapsedMs >= targetMs,
  };
};
