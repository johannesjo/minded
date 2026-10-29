import { createSignal, type Accessor } from "solid-js";
import { easeOutCubic } from "./sunAnimationUtils";

/**
 * A 0..1 value eased toward 0 or 1 on its own animation frame. Sun uses it for
 * the press lift (sunGlow PRESS_SCALE), eased in on grab and out on release
 * over the quick UI beat instead of switched with the drag flag - the
 * transform's CSS ease is off whenever a finger or a glide drives the disc, so
 * switched, the lift would pop in a single frame both ways.
 */
export const createFrameEase = (
  durationMs: number,
  isReducedMotion: () => boolean,
): {
  value: Accessor<number>;
  easeTo: (to: 0 | 1) => void;
  cancel: () => void;
} => {
  const [getValue, setValue] = createSignal(0);
  let frame: number | undefined;
  const cancel = () => {
    if (frame) cancelAnimationFrame(frame);
    frame = undefined;
  };
  const easeTo = (to: 0 | 1) => {
    cancel();
    const from = getValue();
    if (from === to) return;
    if (isReducedMotion()) {
      setValue(to);
      return;
    }
    const start = performance.now();
    const step = (now: number) => {
      const progress = Math.min((now - start) / durationMs, 1);
      setValue(from + (to - from) * easeOutCubic(progress));
      frame = progress < 1 ? requestAnimationFrame(step) : undefined;
    };
    frame = requestAnimationFrame(step);
  };
  return { value: getValue, easeTo, cancel };
};

/**
 * Run `release` two frames from now, not one - after a snap (the CSS
 * transform ease off, the offset written), to hand the transform back to its
 * ease. A rAF callback runs *before* its frame's style recalc, so restoring in
 * the first one lets the browser see the moved transform and the restored
 * transition in the same style change and glide the snap over 160ms (the disc
 * trailing the bar on a resize, or drifting in on load). The first frame
 * paints the snap; the second restores.
 */
export const createAfterPaint = (
  release: () => void,
): { schedule: () => void; cancel: () => void } => {
  let frame: number | undefined;
  const cancel = () => {
    if (frame) cancelAnimationFrame(frame);
    frame = undefined;
  };
  const schedule = () => {
    cancel();
    frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => {
        frame = undefined;
        release();
      });
    });
  };
  return { schedule, cancel };
};
