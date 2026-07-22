// Types
export interface Vector2D {
  x: number;
  y: number;
}

export interface VelocitySample extends Vector2D {
  timestamp: number;
}

export interface PhysicsState {
  position: Vector2D;
  velocity: Vector2D;
  rotation: number;
  scale: number;
  opacity: number;
}

export interface AnimationConfig {
  friction: number;
  gravity: number;
  rotationFactor: number;
  duration: number;
}

export type SunCompletionDirection = "up" | "down";
export type SunDragDirection = SunCompletionDirection | "none";
export type SunCompletionDirectionPolicy = "any" | "down";
export type SunReleaseAction =
  | { type: "snapBack" }
  | { type: "fling"; direction: SunCompletionDirection }
  | { type: "dragComplete"; direction: SunCompletionDirection };

type CompanionRestState = {
  isCompanion: boolean;
  restScale: number;
};

type CompanionReanchorSettle = {
  isCompanion?: boolean;
  anchorXPx?: number;
  anchorYPxFromBottom?: number;
  scale?: number;
  breathe?: boolean;
};

// Constants
export const DRAG_THRESHOLD_PX = 100;
export const FLING_VELOCITY_THRESHOLD = 200;
export const FLING_MIN_DISTANCE_PX = 75;
export const VELOCITY_SAMPLE_SIZE = 5;
export const HAPTIC_PROGRESS_POINTS = [1.0]; // Trigger only at 100%
export const RUBBER_BAND_RANGE = 20;
export const RUBBER_BAND_FACTOR = 0.7;

export const FLING_ANIMATION_CONFIG: AnimationConfig = {
  friction: 0.98,
  gravity: 0,
  rotationFactor: 0.0005,
  duration: 3000,
};

export const COMPLETION_ANIMATION_CONFIG = {
  duration: 3000,
  easing: {
    upward: {
      targetScale: 0.3,
      targetOpacity: 1, // Keep full opacity when moving upward
    },
    downward: {
      targetScale: 1.15,
      targetOpacity: 0.92,
    },
  },
};

// Utility functions
export function calculateVelocity(
  samples: VelocitySample[],
): Vector2D & { magnitude: number } {
  if (samples.length < 2) {
    return { x: 0, y: 0, magnitude: 0 };
  }

  const recentSamples = samples.slice(-Math.min(3, samples.length));
  const first = recentSamples[0];
  const last = recentSamples[recentSamples.length - 1];
  const dt = (last.timestamp - first.timestamp) / 1000;

  if (dt === 0) {
    return { x: 0, y: 0, magnitude: 0 };
  }

  const vx = (last.x - first.x) / dt;
  const vy = (last.y - first.y) / dt;
  const magnitude = Math.sqrt(vx * vx + vy * vy);

  return { x: vx, y: vy, magnitude };
}

export function hasVerticalCompletionIntent(vector: Vector2D): boolean {
  const absX = Math.abs(vector.x);
  const absY = Math.abs(vector.y);

  return absY > 0 && absY >= absX;
}

/**
 * Whether the sun disc should begin a NEW pointer gesture (drag/tap) on
 * pointer-down. Two states make it inert:
 *
 * - `isCompletionStarted`: a terminal animation (fling / drag-complete) is
 *   underway - the disc is on its way out and must not re-arm.
 * - `isSettlingIntoRole`: a role-transition glide (enter/exitSettle) is still
 *   carrying the disc to its rest. Taking a gesture over mid-glide cancels the
 *   glide and re-anchors the rest to the interrupted spot, stranding the disc
 *   there - the "tap the rising sun a second time and it sticks, full-size" bug.
 *   The disc becomes grabbable again the instant the glide lands.
 *
 * The breath loop, snap-back and fling are deliberately NOT covered: they keep
 * the disc grabbable (handleStart takes them over cleanly), so they must not gate
 * here. Pure so Sun.tsx's handleStart guard and this rule can't drift, and so the
 * precedence is unit-tested.
 */
export function shouldAcceptSunPointerStart(state: {
  isCompletionStarted: boolean;
  isSettlingIntoRole: boolean;
}): boolean {
  return !state.isCompletionStarted && !state.isSettlingIntoRole;
}

export function isCompanionReanchorSettle(
  settle?: CompanionReanchorSettle | null,
): boolean {
  return settle?.isCompanion === true;
}

/**
 * Bottom-pinned flow rests can reuse a terminally moved disc. Onboarding hero
 * and sky targets intentionally rely on this without becoming true companion
 * rests, because only the latter may hard-snap during anchor remeasurement.
 */
export function shouldResetTerminalStateForSettle(
  settle?: CompanionReanchorSettle | null,
): boolean {
  return settle?.anchorYPxFromBottom != null && settle.anchorXPx == null;
}

/**
 * A bottom-bar remeasurement may snap only when the disc is already resting at
 * the same companion size. Bottom-pinned onboarding rests use the same anchor
 * shape, but their scale changes are real role morphs and must still glide.
 */
export function shouldSnapCompanionReanchor(
  target: CompanionRestState,
  from: CompanionRestState,
  resting: CompanionRestState,
): boolean {
  return (
    target.isCompanion &&
    from.isCompanion &&
    resting.isCompanion &&
    target.restScale === from.restScale &&
    target.restScale === resting.restScale
  );
}

const getVerticalDirection = (y: number): SunCompletionDirection =>
  y > 0 ? "down" : "up";

const canCompleteDirection = (
  direction: SunCompletionDirection,
  completionDirection: SunCompletionDirectionPolicy = "any",
): boolean => completionDirection === "any" || direction === "down";

export function getSunReleaseAction({
  offset,
  velocity,
  isDragEnabled,
  completionDirection = "any",
}: {
  offset: Vector2D;
  velocity: Vector2D & { magnitude: number };
  isDragEnabled: boolean;
  completionDirection?: SunCompletionDirectionPolicy;
}): SunReleaseAction {
  if (!isDragEnabled) {
    return { type: "snapBack" };
  }

  const hasVerticalDragIntent = hasVerticalCompletionIntent(offset);
  const hasVerticalFlingIntent = hasVerticalCompletionIntent(velocity);
  const hasHighReleaseSpeed = velocity.magnitude >= FLING_VELOCITY_THRESHOLD;
  const hasEnoughFlingTravel = Math.abs(offset.y) >= FLING_MIN_DISTANCE_PX;

  if (hasHighReleaseSpeed && !hasVerticalFlingIntent) {
    return { type: "snapBack" };
  }

  const flingDirection = getVerticalDirection(velocity.y);
  const isFling =
    Math.abs(velocity.y) >= FLING_VELOCITY_THRESHOLD &&
    hasEnoughFlingTravel &&
    hasVerticalDragIntent &&
    hasVerticalFlingIntent;

  if (isFling && canCompleteDirection(flingDirection, completionDirection)) {
    return { type: "fling", direction: flingDirection };
  }

  const dragDirection = getVerticalDirection(offset.y);
  const isDragComplete =
    Math.abs(offset.y) >= DRAG_THRESHOLD_PX && hasVerticalDragIntent;

  if (
    isDragComplete &&
    canCompleteDirection(dragDirection, completionDirection)
  ) {
    return { type: "dragComplete", direction: dragDirection };
  }

  return { type: "snapBack" };
}

export function updatePhysics(
  state: PhysicsState,
  config: AnimationConfig,
  deltaTime: number,
  startOffset: Vector2D,
  startScale: number,
  startOpacity: number,
  screenDimensions: { width: number; height: number },
): PhysicsState {
  // Apply physics
  const newVelocity = {
    x: state.velocity.x * Math.pow(config.friction, deltaTime * 60),
    y:
      state.velocity.y * Math.pow(config.friction, deltaTime * 60) +
      config.gravity * deltaTime,
  };

  // Update position
  const newPosition = {
    x: state.position.x + newVelocity.x * deltaTime,
    y: state.position.y + newVelocity.y * deltaTime,
  };

  // Calculate rotation
  const newRotation =
    state.rotation + newVelocity.x * config.rotationFactor * deltaTime;

  // Calculate distance-based effects
  const distance = Math.sqrt(
    Math.pow(newPosition.x - startOffset.x, 2) +
      Math.pow(newPosition.y - startOffset.y, 2),
  );
  const maxDistance = Math.max(screenDimensions.width, screenDimensions.height);
  const distanceProgress = Math.min(distance / maxDistance, 1);

  // Scale and opacity based on distance
  const newScale = startScale * (1 - distanceProgress * 0.5);
  // Keep full opacity when flinging upward
  const newOpacity =
    newVelocity.y < 0
      ? startOpacity
      : startOpacity * (1 - distanceProgress * 0.8);

  return {
    position: newPosition,
    velocity: newVelocity,
    rotation: newRotation,
    scale: newScale,
    opacity: newOpacity,
  };
}

export function calculateDragEffects(
  deltaY: number,
  dragDistance: number,
  maxDragDistance: number = 200,
): { scale: number; opacity: number; progress: number } {
  const dragProgress = Math.min(dragDistance / maxDragDistance, 1);

  let scale, opacity;
  if (deltaY < 0) {
    // Upward drag
    scale = Math.max(0.88, 1 - dragProgress * 0.12);
    opacity = 1; // Keep full opacity when dragging up
  } else {
    // Downward drag
    scale = Math.min(1.14, 1 + dragProgress * 0.14);
    opacity = 1;
  }

  return { scale, opacity, progress: dragProgress };
}

export function calculateDragColorTemperature(
  dragDirection: SunDragDirection,
  dragDistance: number,
  threshold: number = DRAG_THRESHOLD_PX,
): number {
  if (dragDirection !== "up" || threshold <= 0) {
    return 0;
  }

  return -Math.min(dragDistance / threshold, 1);
}

// The single glow axis: one signed colour temperature in [-1, +1] maps the
// whole sun's halo cool ↔ white ↔ amber, so every state (up-drag cooling,
// resting day companion, departing hand-off) reads off one scale instead of
// swapping between separate box-shadow declarations. White is the neutral
// midpoint; the negative half cools toward night, the positive half warms to
// the one canonical amber shared with the resting companion and the Little Sun
// widget hand-off.
export const GLOW_WHITE_RGB: readonly [number, number, number] = [
  255, 255, 255,
];
export const GLOW_COOL_RGB: readonly [number, number, number] = [200, 220, 255];
export const GLOW_AMBER_RGB: readonly [number, number, number] = [
  255, 214, 115,
];

/**
 * Map a signed colour temperature in [-1, +1] to the halo's `"r, g, b"` triple,
 * ramping continuously cool → white → amber. Pure and threshold-free (no
 * discrete cool/warm step), so any glow change eases rather than snaps.
 */
export function glowColorForTemp(temp: number): string {
  const t = Math.max(-1, Math.min(1, temp));
  const end = t >= 0 ? GLOW_AMBER_RGB : GLOW_COOL_RGB;
  const a = Math.abs(t);
  const mix = (from: number, to: number): number =>
    Math.round(from + (to - from) * a);
  return `${mix(GLOW_WHITE_RGB[0], end[0])}, ${mix(GLOW_WHITE_RGB[1], end[1])}, ${mix(GLOW_WHITE_RGB[2], end[2])}`;
}

export function easeInOut(progress: number): number {
  return progress < 0.5
    ? 2 * progress * progress
    : 1 - Math.pow(-2 * progress + 2, 2) / 2;
}

export function easeOutBack(progress: number): number {
  const overshoot = 1.2; // Subtle overshoot (standard is 1.70158)
  const c3 = overshoot + 1;
  return (
    1 + c3 * Math.pow(progress - 1, 3) + overshoot * Math.pow(progress - 1, 2)
  );
}

export async function triggerHapticPattern(
  pattern: "completion",
): Promise<void> {
  if (pattern === "completion") {
    triggerHaptic("heavy");
    await new Promise((resolve) => setTimeout(resolve, 50));
    triggerHaptic("light");
  }
}

export function applyRubberBanding(delta: number): number {
  const abs = Math.abs(delta);
  const sign = delta >= 0 ? 1 : -1;
  if (abs <= RUBBER_BAND_RANGE) {
    return delta * RUBBER_BAND_FACTOR;
  }
  // After rubber band range: full linear movement
  const rubberedPortion = RUBBER_BAND_RANGE * RUBBER_BAND_FACTOR;
  const linearPortion = abs - RUBBER_BAND_RANGE;
  return sign * (rubberedPortion + linearPortion);
}

export function triggerHaptic(type: "light" | "medium" | "heavy"): void {
  // Check if we're on Android and have the native interface available
  if (typeof window !== "undefined" && window.androidMinded?.triggerHaptic) {
    try {
      window.androidMinded.triggerHaptic(type);
      console.log("Triggered Android haptic:", type);
      return;
    } catch (error) {
      console.warn("Failed to trigger native Android haptic:", error);
    }
  }

  // Fallback to web vibration API
  if ("vibrate" in navigator) {
    const durations = {
      light: 10,
      medium: 20,
      heavy: 30,
    };
    navigator.vibrate(durations[type]);
  }
}

export function getSunSize(screenWidth: number): {
  size: number;
  baseScale: number;
} {
  if (screenWidth >= 1024) {
    return { size: 120, baseScale: 1 };
  } else if (screenWidth >= 600) {
    return { size: 100, baseScale: 1 };
  } else {
    return { size: 80, baseScale: 1.0 };
  }
}
