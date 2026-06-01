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
