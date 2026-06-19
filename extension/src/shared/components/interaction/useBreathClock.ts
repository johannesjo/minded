import {
  type Accessor,
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
  onMount,
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
 * - **owned** (no `originAt`): the clock starts its own origin on `start()`
 *   (or on mount with `autoStart`) — e.g. the wind-down exercise's Start button.
 * - **follow** (`originAt` given): the clock reads an external start timestamp —
 *   e.g. the strong-friction pause reads the sun's `breathStartedAt`, so the
 *   sun's disc and the cue share one origin (GitHub #27).
 */
export interface UseBreathClockOptions {
  pattern: BreathPattern;
  /** Repeat the cycle (wind-down / surf) rather than clamping at the final exhale. */
  loop?: boolean;
  /**
   * Follow an external start origin. While it returns `undefined` the breath has
   * not begun: elapsed clamps to 0 (the pre-start hold during the sun's glide-in).
   * Omit to own the origin via `start()` / `autoStart`.
   */
  originAt?: Accessor<number | undefined>;
  /**
   * When set, the cue holds steady and — in follow mode where the sun is frozen
   * and never publishes an origin — the clock falls back to its mount origin so
   * the countdown still ticks to completion.
   */
  reducedMotion?: boolean;
  /** Owned mode: start the clock on mount. */
  autoStart?: boolean;
  /** Fire `onComplete` this long after the breath begins, then stop. */
  durationMs?: number;
  onComplete?: () => void;
}

export interface BreathClock {
  breath: Accessor<BreathState>;
  elapsedMs: Accessor<number>;
  /** Whether the breath has begun, so the cue should show rather than pre-start-hold. */
  isStarted: Accessor<boolean>;
  start: () => void;
  stop: () => void;
}

/**
 * Pure: the elapsed time to sample the breath at, given the resolved origin.
 * Falls back to `fallbackOrigin` when the primary origin is unset (the
 * reduced-motion countdown in follow mode); with no origin at all the breath
 * sits at elapsed 0 (the pre-start hold). Never negative.
 */
export const breathElapsedMs = (
  now: number,
  origin: number | undefined,
  fallbackOrigin?: number,
): number => {
  const resolved = origin ?? fallbackOrigin;
  return resolved === undefined ? 0 : Math.max(0, now - resolved);
};

export const useBreathClock = (options: UseBreathClockOptions): BreathClock => {
  const { pattern, loop, originAt, reducedMotion, autoStart, durationMs } =
    options;
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

  // The reduced-motion fallback only applies in follow mode: the sun is frozen
  // and never publishes an origin, yet the cue must keep counting down, so it
  // runs off the mount origin. Owned mode just waits for start().
  const fallbackOrigin = (): number | undefined =>
    originAt && reducedMotion ? mountOrigin : undefined;

  const origin = (): number | undefined =>
    originAt ? originAt() : ownedOrigin();

  const isStarted = (): boolean =>
    origin() !== undefined || (originAt !== undefined && !!reducedMotion);

  const elapsedMs = createMemo(() =>
    breathElapsedMs(now(), origin(), fallbackOrigin()),
  );
  const breath = createMemo(() =>
    getBreathStateAt(elapsedMs(), pattern, { loop }),
  );

  // rAF (not a coarse interval) so a cue cross-fade lands cleanly at ~0 opacity
  // on each phase turn instead of popping mid-fade. Stops ticking once the breath
  // has run its `durationMs` (a single pause) so it doesn't spin past the end; a
  // looping clock (no durationMs) keeps going until stop()/cleanup.
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
    clearTimer();
    setOwnedOrigin(Date.now());
    runLoop();
    if (durationMs !== undefined) {
      timeoutId = window.setTimeout(() => onComplete?.(), durationMs);
    }
  };

  const stop = () => {
    cancelFrame();
    clearTimer();
  };

  // Follow mode completion: fire once, measured from the effective origin (the
  // sun's, or the mount origin under reduced motion) so the wall time matches the
  // visible breath. A setTimeout (not the rAF) so a backgrounded tab still ends.
  if (originAt && durationMs !== undefined) {
    let scheduled = false;
    createEffect(() => {
      if (scheduled) return;
      const effective = origin() ?? fallbackOrigin();
      if (effective === undefined) return;
      scheduled = true;
      const remaining = Math.max(0, effective + durationMs - Date.now());
      timeoutId = window.setTimeout(() => onComplete?.(), remaining);
    });
  }

  onMount(() => {
    // Follow mode ticks from mount so the visuals track the shared origin the
    // instant it lands; owned mode waits for start() unless autoStart is set.
    if (originAt) runLoop();
    else if (autoStart) start();
  });

  onCleanup(stop);

  return { breath, elapsedMs, isStarted, start, stop };
};
