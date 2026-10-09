/**
 * The disc's own velocity at release - what the spring (sunSpring.ts) carries
 * on with, so a let-go continues the motion the eye was already following.
 *
 * Measured on the *disc* path, not the finger: the drag rubber-bands the first
 * few px (the disc moves 0.7x the finger there), so finger speed would hand the
 * spring a velocity the disc never had and the release would visibly kick.
 *
 * Least squares over a short window rather than last-minus-first: touchmove
 * timing jitters (and a throttled WebView coalesces moves into ~30-50ms
 * frames), and a two-point difference turns one late event into a spike. A
 * finger that stopped before lifting must hand over ~0, so the estimate fades
 * out as the newest sample goes stale.
 */

export type MotionSample = { x: number; y: number; t: number }; // t in ms

/** Samples older than this (before release) don't vote. */
export const VELOCITY_WINDOW_MS = 100;
/** A pause up to this long before release still counts as moving... */
export const VELOCITY_STALE_START_MS = 40;
/** ...fading linearly to no velocity at all once the pause reaches this. */
export const VELOCITY_STALE_END_MS = 100;
/** Keep at most this many samples while dragging. */
export const MAX_MOTION_SAMPLES = 12;

/**
 * Record a disc position. Unchanged positions are dropped: the release flush
 * re-applies the last move at release time, and a duplicate there would read as
 * the disc braking just before it was let go.
 */
export function pushMotionSample(
  samples: MotionSample[],
  sample: MotionSample,
): MotionSample[] {
  const last = samples[samples.length - 1];
  if (last && last.x === sample.x && last.y === sample.y) return samples;
  const next = [...samples, sample];
  return next.length > MAX_MOTION_SAMPLES
    ? next.slice(next.length - MAX_MOTION_SAMPLES)
    : next;
}

/** Velocity in px/s at `nowMs` (the release instant). */
export function estimateVelocity(
  samples: readonly MotionSample[],
  nowMs: number,
): { x: number; y: number } {
  const zero = { x: 0, y: 0 };
  if (samples.length < 2) return zero;
  const newest = samples[samples.length - 1];
  const stale = nowMs - newest.t;
  const freshness =
    stale <= VELOCITY_STALE_START_MS
      ? 1
      : Math.max(
          0,
          1 -
            (stale - VELOCITY_STALE_START_MS) /
              (VELOCITY_STALE_END_MS - VELOCITY_STALE_START_MS),
        );
  if (freshness === 0) return zero;

  const windowStart = newest.t - VELOCITY_WINDOW_MS;
  const recent = samples.filter((s) => s.t >= windowStart);
  if (recent.length < 2) return zero;

  // Ordinary least squares slope of x(t) and y(t), centred for stability.
  const n = recent.length;
  let meanT = 0;
  let meanX = 0;
  let meanY = 0;
  for (const s of recent) {
    meanT += s.t;
    meanX += s.x;
    meanY += s.y;
  }
  meanT /= n;
  meanX /= n;
  meanY /= n;
  let stt = 0;
  let stx = 0;
  let sty = 0;
  for (const s of recent) {
    const dt = s.t - meanT;
    stt += dt * dt;
    stx += dt * (s.x - meanX);
    sty += dt * (s.y - meanY);
  }
  if (stt === 0) return zero;
  // px/ms → px/s
  return {
    x: (stx / stt) * 1000 * freshness,
    y: (sty / stt) * 1000 * freshness,
  };
}
