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
import { sunRestingSettle } from "./sun/sunSettle";
import { createMemo, type Accessor } from "solid-js";
import type { SessionPlatform } from "@src/dataInterface/syncData";

/**
 * Where the native Android Little Sun bubble will rest, as viewport fractions,
 * from the bridge's `{"fracX":..,"fracY":..,"discPx":..}`. `discPx` is the
 * bubble's disc size - smaller when the user double-tapped it to its mini size -
 * and is left out when absent or invalid (older app). Null (→ the fixed corner) when
 * unavailable, unreadable, or the bridge throws. Number.isFinite (not typeof)
 * so a NaN can't slip through to NaN offsets; clamped to the viewport so a bad
 * value can't fling the disc off-screen.
 */
export type LittleSunRestCenter = { x: number; y: number; discPx?: number };

export const readLittleSunRestCenter = (
  read: () => string | null | undefined,
): LittleSunRestCenter | null => {
  try {
    const raw = read();
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      fracX?: number;
      fracY?: number;
      discPx?: number;
    };
    if (!Number.isFinite(parsed.fracX) || !Number.isFinite(parsed.fracY)) {
      return null;
    }
    const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
    const center: LittleSunRestCenter = {
      x: clamp01(parsed.fracX!),
      y: clamp01(parsed.fracY!),
    };
    if (Number.isFinite(parsed.discPx) && parsed.discPx! > 0) {
      center.discPx = parsed.discPx;
    }
    return center;
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
  restCenter: LittleSunRestCenter | null;
}): SunSettle | null => {
  const { cornerPx, discPx } = littleSunPx(opts.platform);
  if (opts.platform === "android" && opts.restCenter) {
    const { x, y, discPx: restDiscPx } = opts.restCenter;
    const restDisc = restDiscPx ?? discPx;
    return opts.isArriving
      ? sunArriveSettleAt({ x, y }, restDisc)
      : sunDepartSettleAt({ x, y }, restDisc);
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

type CornerSettles = {
  arrive: Accessor<SunSettle | null>;
  depart: Accessor<SunSettle | null>;
};

/**
 * The Little Sun's resting spot, expressed as a sun settle (corner, exact disc
 * size). The departing hand-off glides *to* it; the arriving morph mounts the
 * disc *at* it and glides home - both must target the same point so the two
 * morphs line up on the same spot. On Android the native Little Sun is a
 * free-floating bubble the user can park anywhere (the persisted spot is read on
 * mount), so glide to its real centre; fall back to the fixed corner when the
 * position is unknown (older app, read failed). Disc size + corner differ per
 * platform (native overlay is smaller), so match the right ones.
 *
 * Position and size mirror; the halo does not. Only the *departing* target is
 * amber - it is on its way onto arbitrary app content - while the arriving one
 * is white all the way home, because it is on its way onto our own sky (THE
 * HALO RULE in sunSettle.ts). Hence two targets rather than one.
 *
 * Memoized so each returns a STABLE object identity (they only re-derive when
 * the Android bubble position signal changes). The interaction's settle is read
 * reactively, and the <Sun> settle effect keys off object identity - a fresh
 * object each call would risk a spurious corner→corner glide on the Android
 * branch, which reads the rest centre. Pure constants on web, computed once.
 */
export const createCornerSettles = (
  getPlatform: () => SessionPlatform | undefined,
  getRestCenter: () => LittleSunRestCenter | null,
): CornerSettles => {
  const settle = (isArriving: boolean) =>
    getInteractionCornerSettle({
      platform: getPlatform(),
      isArriving,
      restCenter: getPlatform() === "android" ? getRestCenter() : null,
    });
  return {
    arrive: createMemo(() => settle(true)),
    depart: createMemo(() => settle(false)),
  };
};

/** The settle the interaction's own (non-shell) sun rests on right now. */
export const pickInteractionSunSettle = (state: {
  isArrivingFromCorner: boolean;
  phase: SunPhase;
  getRestingAnchor: () => { x: number; y: number } | null | undefined;
  corners: CornerSettles;
  platform: SessionPlatform | undefined;
}): SunSettle | null => {
  // Arriving: hold the disc at the Little Sun's corner so it mounts exactly
  // where the timer rested; clearing the flag (post-mount) drops the settle to
  // the interactive rest and the sun glides home - the reverse of departing.
  if (state.isArrivingFromCorner) return state.corners.arrive();
  // Resting: tuck under the measured choices block (mirrors the shell sun's
  // getSunSettleForCurrentRole), falling back to the static rest target until
  // the choices are measured.
  if (state.phase === "resting") {
    const anchor = state.getRestingAnchor();
    if (anchor) return sunRestingSettle(anchor);
  }
  // Departing: glide to the Little Sun's corner so the persistent timer reads
  // as the same sun settling in rather than a new element popping up.
  if (state.phase === "departing") return state.corners.depart();
  return getLocalSunSettleForPhase(state.phase, state.platform);
};
