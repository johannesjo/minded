import {
  getSunSettleForPhase,
  LITTLE_SUN_CORNER_PX_ANDROID,
  LITTLE_SUN_CORNER_PX_WEB,
  SUN_REST_SETTLE,
  sunBreatheSettle,
} from "./sunSettle";

describe("getSunSettleForPhase", () => {
  it("returns null for the interactive phase (the sun is draggable, not settled)", () => {
    expect(getSunSettleForPhase("interactive", 7)).toBeNull();
  });

  it("breathing settles in the upper half, scaled down, and breathes", () => {
    const settle = getSunSettleForPhase("breathing", 7);
    expect(settle).not.toBeNull();
    expect(settle!.breathe).toBe(true);
    expect(settle!.anchorYRatio).toBeGreaterThan(0);
    expect(settle!.anchorYRatio).toBeLessThan(0.5);
    expect(settle!.scale).toBeLessThan(1);
  });

  it("breathing passes the pause duration through as the breath length", () => {
    expect(getSunSettleForPhase("breathing", 12)!.breathSeconds).toBe(12);
    expect(getSunSettleForPhase("breathing", 4)!.breathSeconds).toBe(4);
  });

  it("resting returns the shared rest target and does not breathe", () => {
    const settle = getSunSettleForPhase("resting", 7);
    expect(settle).toEqual(SUN_REST_SETTLE);
    expect(settle!.breathe).toBe(false);
  });

  it("resting sits higher and smaller than breathing (a calmer anchor)", () => {
    const breathing = sunBreatheSettle(7);
    // Smaller anchorYRatio == closer to the top.
    expect(SUN_REST_SETTLE.anchorYRatio!).toBeLessThan(breathing.anchorYRatio!);
    expect(SUN_REST_SETTLE.scale!).toBeLessThan(breathing.scale!);
  });

  it("keeps the resting sun clear of the very top edge so it stays visible", () => {
    // Regression: an anchor of ~0.16 sat too high and clipped on short windows.
    expect(SUN_REST_SETTLE.anchorYRatio!).toBeGreaterThanOrEqual(0.22);
  });

  it("departs to the web Little Sun corner by default (square bottom-left anchor)", () => {
    const settle = getSunSettleForPhase("departing", 7)!;
    expect(settle.anchorXPx).toBe(LITTLE_SUN_CORNER_PX_WEB);
    expect(settle.anchorYPxFromBottom).toBe(LITTLE_SUN_CORNER_PX_WEB);
    expect(settle.breathe).toBe(false);
  });

  it("departs to a smaller corner when handed the Android native Little Sun inset", () => {
    // The native overlay's disc centre sits closer to the corner than the web
    // extension's, so the departing sun must aim lower-left to avoid a jump.
    expect(LITTLE_SUN_CORNER_PX_ANDROID).toBeLessThan(LITTLE_SUN_CORNER_PX_WEB);
    const settle = getSunSettleForPhase(
      "departing",
      7,
      undefined,
      LITTLE_SUN_CORNER_PX_ANDROID,
    )!;
    expect(settle.anchorXPx).toBe(LITTLE_SUN_CORNER_PX_ANDROID);
    expect(settle.anchorYPxFromBottom).toBe(LITTLE_SUN_CORNER_PX_ANDROID);
  });
});
