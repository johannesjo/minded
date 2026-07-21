import {
  DEPART_GLOW_INTENSITY,
  SNUG_GLOW_REACH,
  getSunSettleForPhase,
  LITTLE_SUN_CORNER_PX_ANDROID,
  LITTLE_SUN_CORNER_PX_WEB,
  LITTLE_SUN_DISC_PX_ANDROID,
  LITTLE_SUN_DISC_PX_WEB,
  restingSunAnchorFromRect,
  SUN_REST_SETTLE,
  sunBreatheSettle,
  sunDepartSettleAt,
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

  it("resting sits lower than breathing - beneath the choices - and smaller", () => {
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

  it("departs to the web Little Sun corner + disc size by default, with an amber halo", () => {
    const settle = getSunSettleForPhase("departing")!;
    expect(settle.anchorXPx).toBe(LITTLE_SUN_CORNER_PX_WEB);
    expect(settle.anchorYPxFromBottom).toBe(LITTLE_SUN_CORNER_PX_WEB);
    // Pin the exact disc size (not a constant scale) so it matches the 40px web
    // Little Sun, and warm the halo to the one amber so the glow colour matches.
    expect(settle.discPx).toBe(LITTLE_SUN_DISC_PX_WEB);
    expect(settle.warmth).toBe(1);
    expect(settle.reach).toBe(SNUG_GLOW_REACH);
    expect(settle.glowIntensity).toBe(DEPART_GLOW_INTENSITY);
    expect(settle.breathe).toBe(false);
  });

  it("departs to a smaller corner + disc when handed the Android native Little Sun", () => {
    // The native overlay's disc is both nearer the corner and smaller than the
    // web extension's, so the departing sun must aim lower-left AND shrink more.
    expect(LITTLE_SUN_CORNER_PX_ANDROID).toBeLessThan(LITTLE_SUN_CORNER_PX_WEB);
    expect(LITTLE_SUN_DISC_PX_ANDROID).toBeLessThan(LITTLE_SUN_DISC_PX_WEB);
    const settle = getSunSettleForPhase(
      "departing",
      undefined,
      LITTLE_SUN_CORNER_PX_ANDROID,
      LITTLE_SUN_DISC_PX_ANDROID,
    )!;
    expect(settle.anchorXPx).toBe(LITTLE_SUN_CORNER_PX_ANDROID);
    expect(settle.anchorYPxFromBottom).toBe(LITTLE_SUN_CORNER_PX_ANDROID);
    expect(settle.discPx).toBe(LITTLE_SUN_DISC_PX_ANDROID);
  });
});

describe("sunDepartSettleAt", () => {
  it("anchors the departing disc at the measured fractional position", () => {
    // Android hands off to a free-floating bubble parked wherever the user
    // dropped it; the morph targets that centre as viewport fractions so it
    // lands there on any screen size rather than at the fixed corner.
    const settle = sunDepartSettleAt({ x: 0.07, y: 0.86 });
    expect(settle.anchorXRatio).toBe(0.07);
    expect(settle.anchorYRatio).toBe(0.86);
    expect(settle.breathe).toBe(false);
  });

  it("matches the native Little Sun's disc size and amber halo by default", () => {
    // Position differs from the fixed-corner depart, but size + glow must match
    // so the whole hand-off (position, size, halo) is seamless.
    const settle = sunDepartSettleAt({ x: 0.5, y: 0.5 });
    expect(settle.discPx).toBe(LITTLE_SUN_DISC_PX_ANDROID);
    expect(settle.warmth).toBe(1);
    expect(settle.reach).toBe(SNUG_GLOW_REACH);
    expect(settle.glowIntensity).toBe(DEPART_GLOW_INTENSITY);
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
