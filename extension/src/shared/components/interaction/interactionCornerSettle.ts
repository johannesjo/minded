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

/**
 * Where the native Android Little Sun bubble will rest, as viewport fractions,
 * from the bridge's `{"fracX":..,"fracY":..}`. Null (→ the fixed corner) when
 * unavailable, unreadable, or the bridge throws. Number.isFinite (not typeof)
 * so a NaN can't slip through to NaN offsets; clamped to the viewport so a bad
 * value can't fling the disc off-screen.
 */
export type LittleSunRestCenter = { x: number; y: number };

export const readLittleSunRestCenter = (
  read: () => string | null | undefined,
): LittleSunRestCenter | null => {
  try {
    const raw = read();
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { fracX?: number; fracY?: number };
    if (!Number.isFinite(parsed.fracX) || !Number.isFinite(parsed.fracY)) {
      return null;
    }
    const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
    return { x: clamp01(parsed.fracX!), y: clamp01(parsed.fracY!) };
  } catch {
    return null;
  }
};

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
