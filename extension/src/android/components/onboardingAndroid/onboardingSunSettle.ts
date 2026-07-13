import type { SunSettle } from "@src/shared/components/interaction/sun/Sun";
import { sunCompanionSettle } from "@src/shared/components/interaction/sun/sunSettle";

/**
 * Settle targets for the ONE onboarding sun. The whole flow drives a single
 * persistent disc (never a per-step remount) between three rests:
 *
 * - hero: full-size in the slot the welcome / "ready" copy reserves for it
 *   (the measured spacer centre) - the disc the user meets and, at the end,
 *   the disc that's "ready".
 * - sky: small and high, a quiet presence watching over the setup chores
 *   (app picker, permissions) without crowding them.
 * - companion: the bottom-bar rest - the closing glide that hands the very
 *   same disc over to the dashboard shell sun.
 *
 * Every target anchors from the BOTTOM edge with a centred x on purpose: that
 * makes each one "companion-like" to Sun's settle machinery, which then (a)
 * clears a terminal gesture's frozen state when gliding between rests and (b)
 * heals a disc a reduced-motion fling stranded off-screen by fading it back in
 * at the next rest instead of streaking it across the screen.
 *
 * Pure so the step→rest mapping is unit-testable; the component feeds it live
 * measured anchors (px from the bottom edge).
 */

/** Small-but-present: below the 0.52 companion, clearly above a dot. */
export const ONBOARDING_SKY_SUN_SCALE = 0.38;

export interface OnboardingSunState {
  /** The logical step (drives the sun immediately, ahead of the content fade). */
  step: number;
  /** Closing hand-off to the dashboard is in flight. */
  isLeaving: boolean;
  /**
   * Re-entry (initialStep > 0) before the first frame: rest where the dashboard
   * companion just was, so the disc visibly rises out of the bar it rested on.
   */
  isAwaitingLift: boolean;
  /** Step 4's denied branch has no hero slot; the sun stays in the sky. */
  isPermissionNotGiven: boolean;
}

export interface OnboardingSunAnchors {
  /** Measured centre of the current hero spacer; null while none is on screen. */
  heroYFromBottom: number | null;
  skyYFromBottom: number | null;
  companionYFromBottom: number | null;
}

export const getOnboardingSunSettle = (
  state: OnboardingSunState,
  anchors: OnboardingSunAnchors,
): SunSettle | null => {
  if (state.isLeaving || state.isAwaitingLift) {
    return anchors.companionYFromBottom == null
      ? null
      : sunCompanionSettle(anchors.companionYFromBottom);
  }
  const wantsHero =
    state.step === 0 || (state.step >= 4 && !state.isPermissionNotGiven);
  if (wantsHero && anchors.heroYFromBottom != null) {
    return {
      anchorYPxFromBottom: anchors.heroYFromBottom,
      scale: 1,
      breathe: false,
    };
  }
  // Step 0 before the spacer is measured: no target yet (the disc mounts once
  // it can snap straight into the hero slot - never a centre-flash first).
  // Step 4 keeps the sky rest until its spacer lands, then glides down.
  if (wantsHero && state.step === 0) return null;
  return anchors.skyYFromBottom == null
    ? null
    : {
        anchorYPxFromBottom: anchors.skyYFromBottom,
        scale: ONBOARDING_SKY_SUN_SCALE,
        breathe: false,
      };
};
