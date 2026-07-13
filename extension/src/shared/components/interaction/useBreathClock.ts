import {
  type Accessor,
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
} from "solid-js";
import {
  type BreathPattern,
  type BreathState,
  getBreathStateAt,
} from "./breathTimeline";

/**
 * The one clock behind every breath-guided meditation. It owns a single rAF
 * ticker and derives the reactive {@link BreathState} from the shared
 * {@link getBreathStateAt} model, so a disc's scale, a cue's copy and its
 * countdown all read the same elapsed time and can't drift.
 *
 * Two modes:
 * - **owned** (no `originAt`): the clock starts its own origin on `start()` -
 *   e.g. the wind-down exercise's Start button.
 * - **follow** (`originAt` given): the clock reads an external start timestamp -
 *   e.g. the strong-friction pause reads the sun's `breathStartedAt`, so the
 *   sun's disc and the cue share one origin (GitHub #27). It begins ticking only
 *   once that origin lands, and fires `onComplete` `durationMs` later.
 */
export interface UseBreathClockOptions {
  pattern: BreathPattern;
  /** Repeat the cycle (wind-down) rather than clamping at the final exhale. */
  loop?: boolean;
  /**
   * Follow an external start origin. While it returns `undefined` the breath has
   * not begun: elapsed clamps to 0 (the pre-start hold during the sun's glide-in)
   * and the clock stays idle. Omit to own the origin via `start()`.
   */
  originAt?: Accessor<number | undefined>;
  /**
   * When set, the cue holds steady and - in follow mode where the sun is frozen
   * and never publishes an origin - the clock falls back to its mount origin so
   * the countdown still ticks to completion.
   */
  reducedMotion?: boolean;
  /** Follow mode: fire `onComplete` this long after the breath begins, then stop. */
  durationMs?: number;
  onComplete?: () => void;
}

export interface BreathClock {
  breath: Accessor<BreathState>;
  /** Whether the breath has begun, so the cue should show rather than pre-start-hold. */
  isStarted: Accessor<boolean>;
  /** Owned mode: (re)start the clock from now. */
  start: () => void;
}

/**
 * Pure: elapsed time to sample the breath at. Clamps to 0 before the breath has
 * an origin (the pre-start hold) and never goes negative.
 */
export const breathElapsedMs = (
  now: number,
  origin: number | undefined,
): number => (origin === undefined ? 0 : Math.max(0, now - origin));

export const useBreathClock = (options: UseBreathClockOptions): BreathClock => {
  const { pattern, loop, originAt, reducedMotion, durationMs } = options;
  // Capture once so callbacks don't re-read the (possibly reactive) options.
  const onComplete = options.onComplete;
  const mountOrigin = Date.now();

  const [now, setNow] = createSignal(mountOrigin);
  // Owned-mode origin, set by start(); follow mode reads originAt() instead.
  const [ownedOrigin, setOwnedOrigin] = createSignal<number | undefined>(
    undefined,
  );

  let frame: number | undefined;
  let timeoutId: number | undefined;

  const cancelFrame = () => {
    if (frame !== undefined) window.cancelAnimationFrame(frame);
    frame = undefined;
  };
  const clearTimer = () => {
    if (timeoutId !== undefined) window.clearTimeout(timeoutId);
    timeoutId = undefined;
  };

  // The effective origin the breath is measured from. In follow mode under
  // reduced motion the sun is frozen and never publishes one, so it falls back to
  // the mount origin (the countdown still ticks); owned mode just waits for start().
  const effectiveOrigin = (): number | undefined => {
    const o = originAt ? originAt() : ownedOrigin();
    if (o !== undefined) return o;
    return originAt && reducedMotion ? mountOrigin : undefined;
  };

  const isStarted = (): boolean => effectiveOrigin() !== undefined;

  const elapsedMs = createMemo(() => breathElapsedMs(now(), effectiveOrigin()));
  const breath = createMemo(() =>
    getBreathStateAt(elapsedMs(), pattern, { loop }),
  );

  // rAF (not a coarse interval) so a cue cross-fade lands cleanly at ~0 opacity
  // on each phase turn instead of popping mid-fade. Stops once a `durationMs`
  // breath has run (a single pause); a looping clock keeps going until cleanup.
  const tick = () => {
    setNow(Date.now());
    if (durationMs !== undefined && elapsedMs() >= durationMs) {
      frame = undefined;
      return;
    }
    frame = window.requestAnimationFrame(tick);
  };
  const runLoop = () => {
    cancelFrame();
    setNow(Date.now());
    frame = window.requestAnimationFrame(tick);
  };

  const start = () => {
    setOwnedOrigin(Date.now());
    runLoop();
  };

  // Follow mode: begin ticking and schedule completion the moment the breath
  // actually starts - when the origin lands, or immediately under reduced motion.
  // Gating on the origin means no frames are spent during the sun's glide-in, and
  // both visuals and completion read one origin. Fires once (the origin is
  // published a single time per pause). A setTimeout (not the rAF) so a
  // backgrounded tab still completes.
  if (originAt) {
    let started = false;
    createEffect(() => {
      if (started) return;
      const origin = effectiveOrigin();
      if (origin === undefined) return;
      started = true;
      runLoop();
      if (durationMs !== undefined) {
        const remaining = Math.max(0, origin + durationMs - Date.now());
        timeoutId = window.setTimeout(() => onComplete?.(), remaining);
      }
    });
  }

  onCleanup(() => {
    cancelFrame();
    clearTimer();
  });

  return { breath, isStarted, start };
};
