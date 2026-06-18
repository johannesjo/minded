import { createSignal } from "solid-js";
import type { SunSettle } from "./Sun";
import {
  DEFAULT_COMPANION_BOTTOM_Y_PX,
  getSunSettleForPhase,
  sunInteractiveSettle,
  sunRestingSettle,
  type SunPhase,
} from "./sunSettle";

/**
 * Single source of truth for the one shell-owned sun on the new tab. The sun
 * lives in the app shell (MainWrapper) and is reused for everything there: it
 * rests as the companion in the top bar and transforms into the interactive
 * intervention without ever being swapped for a second element.
 *
 * The interaction logic still lives in InteractionCommon — only the sun's
 * terminal outcomes (skip/fling/drag-complete/…) route back to the currently
 * active interaction via the handler registry below. All drag physics stay
 * inside Sun.tsx.
 *
 * This module is a per-document singleton. It is consumed ONLY by the shell
 * (MainWrapper) and by InteractionCommon behind its `useShellSun` flag; the
 * content-script / Android / iOS runtimes keep their own self-owned sun.
 */

export type SunPosition = { x: number; y: number };

export interface SunOutcomeHandlers {
  onSkip: () => void;
  onFlingAway: () => void;
  onDragComplete: () => void;
  onStartBackgroundAnimation?: (direction: "up" | "down") => void;
  onCompletionStarted?: (started: boolean) => void;
  /** Taps to "continue" while interactive (the companion opens via its own tap-target). */
  tapThreshold?: number;
}

/** Current role. "companion" is the idle home; the rest are intervention phases. */
const [getSunRole, setSunRole] = createSignal<SunPhase>("companion");
/** Live center of the disc, pushed by the shell sun each frame. */
const [getSunPosition, setSunPosition] = createSignal<SunPosition | undefined>(
  undefined,
);
/**
 * Bottom-bar anchor (px from the bottom edge) for the companion rest, computed to
 * mirror the `--companion-bar-center-y` CSS var (RouteCmp.module.scss):
 * `--safe-area-inset-bottom` + the `clamp(64px, 10vh, 88px)` band / 2.
 *
 * The bottom inset is non-zero on Android (the system nav/gesture bar), so unlike
 * the old top anchor we can't assume 0 — read it from the same CSS var the layout
 * uses (set on #minded-6622 by setupAndroidInsets) so the disc lands exactly on
 * the bar centre on every platform. Computed (not DOM-measured) so it's exact
 * from the very first paint. Keep in sync with that SCSS var.
 */
const readSafeAreaInsetBottomPx = (): number => {
  const appEl =
    typeof document !== "undefined"
      ? document.getElementById("minded-6622")
      : null;
  if (!appEl) return 0;
  const raw = getComputedStyle(appEl)
    .getPropertyValue("--safe-area-inset-bottom")
    .trim();
  const parsed = parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const computeCompanionBottomYPx = (): number => {
  if (typeof window === "undefined") return DEFAULT_COMPANION_BOTTOM_Y_PX;
  const band = Math.min(88, Math.max(64, window.innerHeight * 0.1));
  return readSafeAreaInsetBottomPx() + band / 2;
};

const [getCompanionBottomYPx, setCompanionBottomYPx] = createSignal(
  computeCompanionBottomYPx(),
);
/** Breath-pause length (seconds) for the "breathing" settle; set by the interaction. */
const [getBreathSeconds, setBreathSeconds] = createSignal(0);

/**
 * Measured viewport-px centre of the interaction's sun placeholder — the empty
 * slot the content flow reserves for the disc (see InteractionCommon). While
 * interactive, the shell sun rests exactly here, so it always lands in the gap
 * the real layout left for it (rather than a fixed CSS guess). null when there
 * is no interaction on screen.
 */
const [getInteractiveSunAnchor, setInteractiveSunAnchor] =
  createSignal<SunPosition | null>(null, {
    // Value-equality: identical re-measurements (the common case — the slot is
    // stable once laid out) must not churn a fresh object and re-fire the sun's
    // settle glide. Only a real move re-targets the disc.
    equals: (a, b) => a?.x === b?.x && a?.y === b?.y,
  });

/**
 * Measured viewport-px centre for the resting sun — the point just beneath the
 * live intent/time choices block (see InteractionCommon). While the choices are
 * up the disc tucks under the options here, gliding down when the taller time
 * options replace the intent ones. null when no choices are on screen, in which
 * case the resting role falls back to the static SUN_REST_SETTLE.
 */
const [getRestingSunAnchor, setRestingSunAnchor] =
  createSignal<SunPosition | null>(null, {
    equals: (a, b) => a?.x === b?.x && a?.y === b?.y,
  });

export {
  getSunRole,
  setSunRole,
  getSunPosition,
  setSunPosition,
  getCompanionBottomYPx,
  setCompanionBottomYPx,
  getBreathSeconds,
  setBreathSeconds,
  getInteractiveSunAnchor,
  setInteractiveSunAnchor,
  getRestingSunAnchor,
  setRestingSunAnchor,
};

/**
 * Settle target for the current role.
 *
 * - companionBottomYPx is read ONLY in the companion branch so that a resize —
 *   which re-measures it — re-anchors the resting companion without spuriously
 *   re-firing the glide for an in-flight interaction phase (e.g. restarting the
 *   breath pause).
 * - "departing" maps to the companion rest: the new-tab shell has no Little Sun
 *   corner to hand off to, so the disc glides straight home as the overlay
 *   fades instead of darting to the corner and springing back to the bottom bar.
 */
export const getSunSettleForCurrentRole = (): SunSettle | null => {
  const role = getSunRole();
  if (role === "companion" || role === "departing") {
    return getSunSettleForPhase("companion", 0, getCompanionBottomYPx());
  }
  // Interactive: rest on the measured placeholder centre (full size, no breath)
  // so the draggable disc sits exactly in the slot the content reserved for it.
  // Until the placeholder is measured, fall back to the untransformed base.
  if (role === "interactive") {
    const anchor = getInteractiveSunAnchor();
    return anchor ? sunInteractiveSettle(anchor) : null;
  }
  // Resting: tuck under the measured choices block; fall back to the static
  // rest target until the choices are measured (or when none are showing).
  if (role === "resting") {
    const anchor = getRestingSunAnchor();
    return anchor
      ? sunRestingSettle(anchor)
      : getSunSettleForPhase("resting", getBreathSeconds());
  }
  return getSunSettleForPhase(role, getBreathSeconds());
};

// --- Outcome handler registry ------------------------------------------------
// The active interaction registers its terminal-outcome handlers on mount and
// clears them on cleanup; the shell sun reads them lazily at outcome time so the
// latest registration always wins.
let handlers: SunOutcomeHandlers | null = null;

export const registerSunInteraction = (h: SunOutcomeHandlers): (() => void) => {
  handlers = h;
  return () => {
    if (handlers === h) handlers = null;
  };
};

export const getSunHandlers = (): SunOutcomeHandlers | null => handlers;
