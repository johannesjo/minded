import {
  clampEasedHandoff,
  clampTimedHandoffVelocity,
  createReleaseSpring,
  isSpringAtRest,
  stepCriticalSpring,
  SUN_SPRING_OMEGA,
  timedSpringBasis,
  velocityHandoffTerm,
  type SpringAxis,
} from "./sunSpring";

/**
 * What the disc does with its momentum once the finger lets go - the three
 * release paths in Sun.tsx, composed from the spring maths in sunSpring.ts.
 * Pure: Sun.tsx feeds frame time and applies the result.
 */

type Vec = { x: number; y: number };

export type SnapBackFrame = {
  /** Disc displacement from its rest, px. */
  offset: Vec;
  /** How much of the release look (scale/opacity/rotation/glow) remains: 1 → 0. */
  look: number;
  /** Home: apply the exact rest and stop. */
  done: boolean;
};

/**
 * A release short of any threshold: the disc goes home on a critically damped
 * spring, carrying on with the velocity it was let go at - slowing, turning if
 * it was heading away, and coming to rest without passing home. The disc's
 * look (scale, opacity, rotation, the drag glow) rides a second, momentum-free
 * spring on the same ω, so it settles on the same beat as the position.
 *
 * Returns a stepper: call it with each frame's elapsed seconds.
 */
export function createSnapBack(
  displacement: Vec,
  releaseVelocity: Vec,
  reducedMotion: boolean,
): (dt: number) => SnapBackFrame {
  const spring = createReleaseSpring(displacement, releaseVelocity, {
    reducedMotion,
  });
  let x = spring.x;
  let y = spring.y;
  let look: SpringAxis = { x: 1, v: 0 };
  return (dt) => {
    x = stepCriticalSpring(x, spring.omega, dt);
    y = stepCriticalSpring(y, spring.omega, dt);
    look = stepCriticalSpring(look, SUN_SPRING_OMEGA, dt);
    return {
      offset: { x: x.x, y: y.x },
      look: Math.max(0, look.x),
      done: isSpringAtRest(x) && isSpringAtRest(y) && look.x < 0.002,
    };
  };
}

/**
 * A release that hands the disc straight into a timed role glide (the
 * dashboard down-drag recalled to its companion rest). Clamp the momentum
 * against the take-off displacement so the glide can't pass its target.
 */
export function timedGlideHandoff(
  startOffset: Vec,
  targetOffset: Vec,
  releaseVelocity: Vec,
  durationMs: number,
): Vec {
  return {
    x: clampTimedHandoffVelocity(
      startOffset.x - targetOffset.x,
      releaseVelocity.x,
      durationMs,
    ),
    y: clampTimedHandoffVelocity(
      startOffset.y - targetOffset.y,
      releaseVelocity.y,
      durationMs,
    ),
  };
}

/**
 * Position along a timed glide at `progress` ∈ [0,1]. With a hand-off it runs
 * the timed spring (leaves with the release velocity, lands exactly at the
 * end); without one, the plain eased curve every choreographed glide uses.
 * `eased` is the fraction of the way home, for anything (scale) that follows.
 */
export function glideOffsetAt(
  progress: number,
  from: Vec,
  target: Vec,
  handoff: Vec | null,
  durationMs: number,
  ease: (t: number) => number,
): { offset: Vec; eased: number } {
  if (!handoff) {
    const eased = ease(progress);
    return {
      offset: {
        x: from.x + (target.x - from.x) * eased,
        y: from.y + (target.y - from.y) * eased,
      },
      eased,
    };
  }
  const { p, q } = timedSpringBasis(progress);
  const momentumSec = (q * durationMs) / 1000;
  return {
    offset: {
      x: target.x + (from.x - target.x) * p + handoff.x * momentumSec,
      y: target.y + (from.y - target.y) * p + handoff.y * momentumSec,
    },
    eased: 1 - p,
  };
}

/**
 * The drag-complete exit keeps its calm eased shape and length, but leaves at
 * the speed it was let go at instead of from a standstill, then melts back
 * onto its eased curve. Returns the y offset at `progress`.
 */
export function completionYAt(
  progress: number,
  startY: number,
  targetY: number,
  releaseVelocityY: number,
  durationMs: number,
  ease: (t: number) => number,
): number {
  const momentum = clampEasedHandoff(
    (releaseVelocityY * durationMs) / 1000,
    targetY - startY,
  );
  return (
    startY +
    (targetY - startY) * ease(progress) +
    momentum * velocityHandoffTerm(progress)
  );
}
