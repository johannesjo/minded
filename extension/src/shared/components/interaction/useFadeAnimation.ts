import { createSignal, onCleanup } from "solid-js";

/**
 * Calculate fade progress as a value between 0 and 1.
 */
export function calculateFadeProgress(
  elapsed: number,
  duration: number,
): number {
  return Math.min(elapsed / duration, 1);
}

/**
 * Calculate opacity based on starting opacity and fade progress.
 */
export function calculateOpacity(
  startOpacity: number,
  progress: number,
): number {
  return startOpacity * (1 - progress);
}

/**
 * Options for the fade animation hook.
 */
export interface FadeAnimationOptions {
  /** Duration of fade in milliseconds (default: 1000) */
  duration?: number;
  /** Starting opacity value (default: 1) */
  startOpacity?: number;
  /** Callback when fade completes */
  onComplete?: () => void;
}

/**
 * Creates a reusable fade animation composable.
 * Manages fade state and provides methods to start/cancel fade animations.
 *
 * @example
 * const fade = createFadeAnimation();
 *
 * // Start fade with default duration
 * fade.start();
 *
 * // Start fade with custom options
 * fade.start({ duration: 700, onComplete: () => console.log('done') });
 *
 * // Cancel ongoing fade
 * fade.cancel();
 *
 * // Use in JSX
 * <div style={{ opacity: fade.getOpacity() }}>Content</div>
 */
export function createFadeAnimation(defaultDuration = 1000) {
  const [getOpacity, setOpacity] = createSignal(1);
  const [getIsFading, setIsFading] = createSignal(false);

  let animationFrame: number | undefined;

  const cancel = () => {
    if (animationFrame !== undefined) {
      cancelAnimationFrame(animationFrame);
      animationFrame = undefined;
    }
    setIsFading(false);
  };

  const start = (options: FadeAnimationOptions = {}) => {
    const {
      duration = defaultDuration,
      startOpacity = getOpacity(),
      onComplete,
    } = options;

    // Cancel any existing animation
    cancel();

    setIsFading(true);
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = calculateFadeProgress(elapsed, duration);
      const opacity = calculateOpacity(startOpacity, progress);

      setOpacity(opacity);

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      } else {
        setIsFading(false);
        animationFrame = undefined;
        onComplete?.();
      }
    };

    animationFrame = requestAnimationFrame(animate);
  };

  const reset = (opacity = 1) => {
    cancel();
    setOpacity(opacity);
  };

  // Cleanup on unmount
  onCleanup(cancel);

  return {
    getOpacity,
    setOpacity,
    getIsFading,
    start,
    cancel,
    reset,
  };
}
