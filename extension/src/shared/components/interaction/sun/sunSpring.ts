/**
 * The sun's weight: a critically damped spring for everything that moves the
 * disc *after a gesture* - the snap-back home when a drag is released short of
 * a threshold, and a release that hands the disc straight into a role glide.
 *
 * Why critically damped: it is the fastest a spring can come home without
 * passing it. Anything underdamped wobbles around the rest, and a wobble is a
 * jolt - calm is the product. So the disc arrives like a real object that was
 * let go: it keeps the speed the finger gave it, and that speed bleeds away
 * into the rest without a bounce.
 *
 * All pure (no DOM, no clock): Sun.tsx drives these from rAF, the tests drive
 * them directly. Displacements are always *from the target* (0 = at rest), in
 * px; velocities in px/s; time in seconds unless a name says ms.
 */

/**
 * Natural frequency of the free snap-back spring (rad/s). At 14 a 100px
 * release with no velocity is within 0.3px of home after ~0.6s - the same
 * length the old eased snap-back ran, so the gesture's rhythm is unchanged.
 */
export const SUN_SPRING_OMEGA = 14;
/**
 * A throw *toward* the rest faster than ω·distance would carry a critically
 * damped spring past it. Rather than overshoot, the spring stiffens to meet the
 * throw (it arrives sooner, as a fast throw should) - up to this multiple of
 * the base ω, past which the release speed is clamped instead.
 */
export const SUN_SPRING_MAX_STIFFEN = 3;
/** Below both of these the spring is home: snap the last sub-pixel and stop. */
export const SPRING_REST_PX = 0.3;
export const SPRING_REST_VELOCITY = 8;
/**
 * The fastest release speed (px/s, per axis) the disc carries into any spring.
 * A real finger flick peaks around 3-4k px/s; carrying all of it *away* from a
 * rest would sail the disc off-screen before the spring could turn it.
 */
export const MAX_HANDOFF_VELOCITY = 2500;

export type SpringAxis = { x: number; v: number };

/**
 * Advance a critically damped spring by `dt` seconds, exactly.
 *
 * Closed form rather than Euler: x(t) = (x0 + (v0 + ωx0)t)·e^(−ωt). Exact for
 * any dt, so a dropped frame (or a 4x-throttled WebView's 50ms frames) lands
 * the disc exactly where a smooth 60fps run would have - no frame-rate
 * dependent drift, no instability at large steps.
 */
export function stepCriticalSpring(
  state: SpringAxis,
  omega: number,
  dt: number,
): SpringAxis {
  if (dt <= 0) return state;
  const { x, v } = state;
  const b = v + omega * x;
  const decay = Math.exp(-omega * dt);
  return {
    x: (x + b * dt) * decay,
    v: (v - omega * b * dt) * decay,
  };
}

export function isSpringAtRest(state: SpringAxis): boolean {
  return (
    Math.abs(state.x) < SPRING_REST_PX &&
    Math.abs(state.v) < SPRING_REST_VELOCITY
  );
}

const clampMagnitude = (v: number, max: number): number =>
  Math.max(-max, Math.min(max, v));

/** Speed with which `v` heads toward the rest from displacement `x` (≤0 = away). */
const approachSpeed = (x: number, v: number): number =>
  x === 0 ? 0 : -Math.sign(x) * v;

/**
 * The ω to run a release on so no axis passes its rest: the base ω, stiffened
 * just enough to absorb the fastest approach (a critically damped spring stays
 * on one side iff its approach speed ≤ ω·|x|), capped at
 * SUN_SPRING_MAX_STIFFEN·ω. One ω for every axis keeps the 2D path straight.
 */
export function noOvershootOmega(
  axes: readonly SpringAxis[],
  omega: number = SUN_SPRING_OMEGA,
): number {
  let needed = omega;
  for (const { x, v } of axes) {
    const approach = approachSpeed(x, v);
    if (approach > 0 && Math.abs(x) > 0) {
      needed = Math.max(needed, approach / Math.abs(x));
    }
  }
  return Math.min(needed, omega * SUN_SPRING_MAX_STIFFEN);
}

/**
 * The release velocity an axis may actually carry into a spring of `omega`:
 * capped overall (MAX_HANDOFF_VELOCITY) and, toward the rest, at ω·|x| so the
 * disc can never cross it. Away from the rest it keeps its speed - it travels
 * on, slows, and comes home: what a thrown thing on a soft tether does.
 */
export function clampHandoffVelocity(
  x: number,
  v: number,
  omega: number,
): number {
  const capped = clampMagnitude(v, MAX_HANDOFF_VELOCITY);
  const approach = approachSpeed(x, capped);
  const maxApproach = omega * Math.abs(x);
  if (approach > maxApproach) return -Math.sign(x) * maxApproach;
  return capped;
}

/**
 * Build the spring axes for a release from displacement `offset` (disc minus
 * rest) with `velocity`, stiffened and clamped so it can't overshoot. Under
 * reduced motion the release carries no momentum at all: the disc just eases
 * home on the plain spring (never past it, never squashed).
 */
export function createReleaseSpring(
  offset: { x: number; y: number },
  velocity: { x: number; y: number },
  opts: { reducedMotion?: boolean; omega?: number } = {},
): { omega: number; x: SpringAxis; y: SpringAxis } {
  const base = opts.omega ?? SUN_SPRING_OMEGA;
  const v = opts.reducedMotion ? { x: 0, y: 0 } : velocity;
  const cappedX = clampMagnitude(v.x, MAX_HANDOFF_VELOCITY);
  const cappedY = clampMagnitude(v.y, MAX_HANDOFF_VELOCITY);
  const omega = noOvershootOmega(
    [
      { x: offset.x, v: cappedX },
      { x: offset.y, v: cappedY },
    ],
    base,
  );
  return {
    omega,
    x: { x: offset.x, v: clampHandoffVelocity(offset.x, cappedX, omega) },
    y: { x: offset.y, v: clampHandoffVelocity(offset.y, cappedY, omega) },
  };
}

// --- Timed spring: the same spring, made to land on a fixed beat. ---
//
// Role glides (the companion rise, the return home, ...) have duration
// contracts: other code waits on them (onboarding hands off after
// COMPANION_GLIDE_MS, the glide's own onDone ungates the disc). When a release
// hands the disc into one of these, it should keep the finger's momentum AND
// land exactly on time. So the spring's ω is tied to the duration (ω = U/T),
// and a tiny Hermite correction removes the e^(−U) residue so the disc is
// exactly home, at exactly zero speed, at exactly T - no last-frame snap.

/**
 * Spring "tightness" over a timed glide: ω·T. At 5.5 the residue the end
 * correction has to absorb is ~3% of the distance, spread smoothly over the
 * whole glide, and the peak speed (~2·D/T) matches the eased glide it replaces.
 */
export const TIMED_SPRING_U = 5.5;

/**
 * Basis of the timed spring at normalised time τ ∈ [0,1]:
 * displacement(τ) = x0·p + (v0·T)·q. Exact landing: p(1) = q(1) = 0 and both
 * have zero slope there; p(0) = 1, q(0) = 0, q'(0) = 1 (in τ) so the glide
 * leaves with exactly the release velocity.
 */
export function timedSpringBasis(
  tau: number,
  U: number = TIMED_SPRING_U,
): { p: number; q: number } {
  if (tau <= 0) return { p: 1, q: 0 };
  if (tau >= 1) return { p: 0, q: 0 };
  const u = U * tau;
  const e = Math.exp(-u);
  const eU = Math.exp(-U);
  // Hermite end correction: a(τ) moves the residue to 0, b(τ) its slope.
  const a = tau * tau * (3 - 2 * tau);
  const b = tau * tau * (tau - 1);
  const pEnd = (1 + U) * eU;
  const pSlopeEnd = -U * U * eU;
  const qEnd = eU;
  const qSlopeEnd = eU * (1 - U);
  return {
    p: (1 + u) * e - (pEnd * a + pSlopeEnd * b),
    q: tau * e - (qEnd * a + qSlopeEnd * b),
  };
}

/**
 * The release velocity a timed glide of `durationMs` may carry on an axis with
 * displacement `x` (from the glide's target): capped overall, and toward the
 * target at (U/T)·|x|, the timed spring's no-crossing bound (with a small
 * margin for the end correction).
 */
export function clampTimedHandoffVelocity(
  x: number,
  v: number,
  durationMs: number,
  U: number = TIMED_SPRING_U,
): number {
  if (durationMs <= 0) return 0;
  return clampHandoffVelocity(x, v, (0.9 * U) / (durationMs / 1000));
}

/**
 * A momentum term for an eased glide whose shape is choreographed (the
 * drag-complete exit eases out over a fixed 3s): add m·τ(1−τ)² to the eased
 * position and the glide leaves with velocity m (per unit τ) instead of from a
 * standstill, then fades back onto its own curve - landing untouched.
 */
export function velocityHandoffTerm(tau: number): number {
  if (tau <= 0 || tau >= 1) return 0;
  return tau * (1 - tau) * (1 - tau);
}

/**
 * Clamp for velocityHandoffTerm on an easeInOut glide over `distance`: m may
 * carry up to 2·distance toward the target (beyond that the sum would pass the
 * target before τ = 1) and the same away from it.
 */
export function clampEasedHandoff(m: number, distance: number): number {
  const max = 2 * Math.abs(distance);
  return clampMagnitude(m, max);
}
