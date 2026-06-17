import { createSignal } from "solid-js";
import type { SunSettle } from "./Sun";
import {
  DEFAULT_COMPANION_BOTTOM_Y_PX,
  getSunSettleForPhase,
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

export {
  getSunRole,
  setSunRole,
  getSunPosition,
  setSunPosition,
  getCompanionBottomYPx,
  setCompanionBottomYPx,
  getBreathSeconds,
  setBreathSeconds,
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
  return role === "companion" || role === "departing"
    ? getSunSettleForPhase("companion", 0, getCompanionBottomYPx())
    : getSunSettleForPhase(role, getBreathSeconds());
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
