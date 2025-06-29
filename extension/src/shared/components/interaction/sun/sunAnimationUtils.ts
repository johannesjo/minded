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

// Constants
export const DRAG_THRESHOLD_PX = 100;
export const FLING_VELOCITY_THRESHOLD = 200;
export const VELOCITY_SAMPLE_SIZE = 5;

export const FLING_ANIMATION_CONFIG: AnimationConfig = {
  friction: 0.98,
  gravity: 0,
  rotationFactor: 0.0005,
  duration: 5000,
};

export const COMPLETION_ANIMATION_CONFIG = {
  duration: 5000,
  easing: {
    upward: {
      targetScale: 0.3,
      targetOpacity: 0.2,
    },
    downward: {
      targetScale: 5.0,
      targetOpacity: 1,
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
  const newOpacity = startOpacity * (1 - distanceProgress * 0.8);

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
    scale = Math.max(0.7, 1 - dragProgress * 0.3);
    opacity = Math.max(0.5, 1 - dragProgress * 0.5);
  } else {
    // Downward drag
    scale = Math.min(2, 1 + dragProgress * 1.5);
    opacity = 1;
  }

  return { scale, opacity, progress: dragProgress };
}

export function easeInOut(progress: number): number {
  return progress < 0.5
    ? 2 * progress * progress
    : 1 - Math.pow(-2 * progress + 2, 2) / 2;
}

export function easeOut(progress: number): number {
  return 1 - Math.pow(1 - progress, 3);
}

export function triggerHaptic(
  type: "light" | "medium" | "heavy" | "threshold",
): void {
  // Check if we're on Android and have the native interface available
  if (
    typeof window !== "undefined" &&
    "androidMinded" in window &&
    (window as any).androidMinded?.triggerHaptic
  ) {
    try {
      (window as any).androidMinded.triggerHaptic(type);
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
