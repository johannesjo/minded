import {
  getSunSettleForPhase,
  LITTLE_SUN_CORNER_PX_ANDROID,
  LITTLE_SUN_CORNER_PX_WEB,
  LITTLE_SUN_DISC_PX_ANDROID,
  LITTLE_SUN_DISC_PX_WEB,
  sunArriveSettle,
  sunArriveSettleAt,
  sunDepartSettleAt,
  type SunPhase,
} from "./sun/sunSettle";
import type { SunSettle } from "./sun/Sun";
import type { SessionPlatform } from "@src/dataInterface/syncData";

/** The Little Sun's corner and disc size for the platform the interaction runs on. */
const littleSunPx = (platform: SessionPlatform | undefined) =>
  platform === "android"
    ? {
        cornerPx: LITTLE_SUN_CORNER_PX_ANDROID,
        discPx: LITTLE_SUN_DISC_PX_ANDROID,
      }
    : { cornerPx: LITTLE_SUN_CORNER_PX_WEB, discPx: LITTLE_SUN_DISC_PX_WEB };

/**
 * The settle at the Little Sun's corner, arriving (the reverse morph after a
 * session timer) or departing (the hand-off into the timer). On Android the
 * bubble may have been dragged, so a reported rest centre wins over the fixed
 * corner; the web corner is a constant.
 */
export const getInteractionCornerSettle = (opts: {
  platform: SessionPlatform | undefined;
  isArriving: boolean;
  restCenter: { x: number; y: number } | null;
}): SunSettle | null => {
  const { cornerPx, discPx } = littleSunPx(opts.platform);
  if (opts.platform === "android" && opts.restCenter) {
    return opts.isArriving
      ? sunArriveSettleAt(opts.restCenter)
      : sunDepartSettleAt(opts.restCenter);
  }
  if (opts.isArriving) return sunArriveSettle(cornerPx, discPx);
  return getSunSettleForPhase(
    "departing",
    // companionBottomYPx is only read for the "companion" phase, which the
    // local (non-shell) sun never enters - keep the default.
    undefined,
    cornerPx,
    discPx,
  );
};

/** The phase settle for a local (non-shell) sun, sized for its platform. */
export const getLocalSunSettleForPhase = (
  phase: SunPhase,
  platform: SessionPlatform | undefined,
): SunSettle | null => {
  const { cornerPx, discPx } = littleSunPx(platform);
  return getSunSettleForPhase(phase, undefined, cornerPx, discPx);
};
