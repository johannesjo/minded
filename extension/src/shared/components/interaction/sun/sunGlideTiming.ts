import { createMemo, createSignal, on, type Accessor } from "solid-js";
import { shouldResetTerminalStateForSettle } from "./sunAnimationUtils";
import type { SunSettle } from "./Sun";

/**
 * Duration of a glide to/from a companion-style rest (the bottom-bar home).
 * Exported so a caller sequencing a hand-off around the glide (the Android
 * onboarding waits for the disc to land before swapping in the dashboard
 * shell) shares the real duration instead of a drifting copy.
 */
export const COMPANION_GLIDE_MS = 900;

// --- Post-interaction settle: the sun stays on screen and transforms across
// the breath pause and the intent/time choices instead of being hidden and
// replaced by a separate sun. ---
export const GLIDE_DURATION_MS = 650;
export const EXIT_GLIDE_MS = 500;
// The reverse of the departing hand-off: the intervention sun mounts snapped at
// the Little Sun's corner (tiny + amber) and glides home, growing to full size.
// At the normal EXIT_GLIDE_MS this reveal reads as the sun "growing strong and
// moving fast" - a ~3x scale jump plus a diagonal corner→centre traverse in half
// a second, too abrupt for the calm premise. Give the arrival its own, much
// slower duration (on the gentle side of the companion rise it echoes) so the
// disc eases up and grows softly into place. Scoped to the corner arrival only
// (see exitSettle): every other exit-to-base transition keeps its snappier feel.
export const ARRIVE_FROM_CORNER_MS = 1100;

/**
 * How long the glide from `fromSettle` to `settle` takes (null = back to the
 * untransformed base). One source for Sun's enterSettle/exitSettle and the
 * halo (createSettleHalo), so the glow can't drift out of step with the
 * position it travels with.
 *
 * Glides to/from the dashboard companion (the bottom-bar rest rising into the
 * interaction, and the return home) get a gentler, slower duration than other
 * transitions (e.g. cancelling the intent/time choices), which keep the
 * snappier default.
 */
export const settleGlideMs = (
  settle: SunSettle | null,
  fromSettle?: SunSettle | null,
): number => {
  if (settle) {
    // An arrival from outside the app (discPx without warmth: the widget's
    // sun) glides slowest.
    return fromSettle?.discPx != null && !fromSettle.warmth
      ? ARRIVE_FROM_CORNER_MS
      : shouldResetTerminalStateForSettle(fromSettle)
        ? COMPANION_GLIDE_MS
        : GLIDE_DURATION_MS;
  }
  // Leaving a settle that pins a disc size (discPx) is the arrive-from-corner
  // reveal - the sun gliding out of the Little Sun's corner as an intervention
  // begins; only that settle shape carries discPx (the departing/corner
  // targets), so it uniquely identifies the arrival.
  return fromSettle?.discPx != null
    ? ARRIVE_FROM_CORNER_MS
    : shouldResetTerminalStateForSettle(fromSettle)
      ? COMPANION_GLIDE_MS
      : EXIT_GLIDE_MS;
};

/**
 * The halo travels with the glide: until the disc has landed on the current
 * settle, `glideMs()` is that glide's duration (null once landed), for the
 * box-shadow ease (sunHaloTransition). Derived in the same render pass as the
 * new glow, so the very first frame of a settle change already carries the
 * long transition - set later (from the settle effect, after a layout read has
 * flushed styles) it would miss the change and the halo would snap ahead of
 * the disc. Call `land(settle)` wherever the disc arrives (or snaps) home.
 */
export const createSettleHalo = (
  getSettle: () => SunSettle | null,
): {
  glideMs: Accessor<number | null>;
  land: (s: SunSettle | null) => void;
} => {
  const getGlideMs = createMemo(
    on(getSettle, (settle, prevSettle) => settleGlideMs(settle, prevSettle)),
  );
  const [getLanded, setLanded] = createSignal<SunSettle | null>(getSettle());
  return {
    glideMs: () => (getSettle() !== getLanded() ? getGlideMs() : null),
    land: (settle) => setLanded(() => settle),
  };
};
