import {
  getSunSettleForPhase,
  LITTLE_SUN_CORNER_PX_ANDROID,
  LITTLE_SUN_CORNER_PX_WEB,
  restingSunAnchorFromRect,
  SUN_REST_SETTLE,
  sunBreatheSettle,
  sunRestingSettle,
} from "./sunSettle";

describe("getSunSettleForPhase", () => {
  it("returns null for the interactive phase (the sun is draggable, not settled)", () => {
    expect(getSunSettleForPhase("interactive")).toBeNull();
  });

  it("breathing settles in the upper half, scaled down, and breathes", () => {
    const settle = getSunSettleForPhase("breathing");
    expect(settle).not.toBeNull();
    expect(settle!.breathe).toBe(true);
    expect(settle!.anchorYRatio).toBeGreaterThan(0);
    expect(settle!.anchorYRatio).toBeLessThan(0.5);
    expect(settle!.scale).toBeLessThan(1);
  });

  it("breathing carries a breath pattern for the sun to follow", () => {
    // Shape and duration live on the pattern (the single source of truth the
    // cue copy reads too), not a separate seconds field.
    expect(getSunSettleForPhase("breathing")!.breathPattern).toBeDefined();
  });

  it("resting returns the shared rest target and does not breathe", () => {
    const settle = getSunSettleForPhase("resting");
    expect(settle).toEqual(SUN_REST_SETTLE);
    expect(settle!.breathe).toBe(false);
  });

  it("resting sits lower than breathing — beneath the choices — and smaller", () => {
    const breathing = sunBreatheSettle();
    // The choices ride at the top now, so the rest target drops below the breath
    // anchor (larger anchorYRatio == closer to the bottom) while staying smaller.
    expect(SUN_REST_SETTLE.anchorYRatio!).toBeGreaterThan(
      breathing.anchorYRatio!,
    );
    expect(SUN_REST_SETTLE.scale!).toBeLessThan(breathing.scale!);
  });

  it("keeps the static rest fallback in the lower band, clear of both edges", () => {
    // It sits beneath the choices but must not clip the bottom / cancel link.
    expect(SUN_REST_SETTLE.anchorYRatio!).toBeGreaterThanOrEqual(0.6);
    expect(SUN_REST_SETTLE.anchorYRatio!).toBeLessThanOrEqual(0.85);
  });

  it("departs to the web Little Sun corner by default (square bottom-left anchor)", () => {
    const settle = getSunSettleForPhase("departing")!;
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
      undefined,
      LITTLE_SUN_CORNER_PX_ANDROID,
    )!;
    expect(settle.anchorXPx).toBe(LITTLE_SUN_CORNER_PX_ANDROID);
    expect(settle.anchorYPxFromBottom).toBe(LITTLE_SUN_CORNER_PX_ANDROID);
  });
});

describe("sunRestingSettle", () => {
  it("anchors the disc centre at the measured point, keeping the rest scale", () => {
    const settle = sunRestingSettle({ x: 640, y: 700 });
    expect(settle.anchorXPx).toBe(640);
    expect(settle.anchorYPxFromTop).toBe(700);
    expect(settle.scale).toBe(SUN_REST_SETTLE.scale);
    expect(settle.breathe).toBe(false);
  });
});

describe("restingSunAnchorFromRect", () => {
  it("returns the centre of the reserved spacer rect", () => {
    const anchor = restingSunAnchorFromRect({
      left: 410,
      width: 460,
      top: 540,
      height: 132,
    });
    expect(anchor.x).toBe(640); // 410 + 460 / 2
    expect(anchor.y).toBe(606); // 540 + 132 / 2
  });

  it("tracks the spacer wherever the centred group places it", () => {
    const high = restingSunAnchorFromRect({
      left: 0,
      width: 200,
      top: 300,
      height: 100,
    });
    const low = restingSunAnchorFromRect({
      left: 0,
      width: 200,
      top: 500,
      height: 100,
    });
    expect(high.y).toBe(350);
    expect(low.y).toBe(550); // moves straight down with the spacer, no clamp
  });
});
