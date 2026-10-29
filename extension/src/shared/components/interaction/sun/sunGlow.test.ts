import {
  COMPANION_HOVER_SCALE,
  interactionScaleFor,
  PRESS_SCALE,
  sunGlowTemp,
} from "./sunGlow";

describe("sunGlowTemp", () => {
  it("lets the drag own the cool half for both discs", () => {
    expect(sunGlowTemp("sun", -0.6, 1)).toBe(-0.6);
    expect(sunGlowTemp("moon", -0.6, 1)).toBe(-0.6);
  });
  it("uses the settle's warmth for the sun once the drag is not cool", () => {
    expect(sunGlowTemp("sun", 0, 1)).toBe(1);
    expect(sunGlowTemp("sun", 0.4, undefined)).toBe(0);
  });
  it("never warms the moon", () => {
    expect(sunGlowTemp("moon", 0.9, 1)).toBe(0);
  });
});

describe("interactionScaleFor", () => {
  const rest = {
    isCompletionStarted: false,
    pressLift: 0,
    isHovered: false,
    isPointerOver: false,
  };
  it("eases out of the press once a completion has started", () => {
    expect(
      interactionScaleFor({
        ...rest,
        isCompletionStarted: true,
        isPointerOver: true,
      }),
    ).toBe(1);
    expect(
      interactionScaleFor({ ...rest, isCompletionStarted: true, pressLift: 1 }),
    ).toBe(PRESS_SCALE);
    expect(
      interactionScaleFor({
        ...rest,
        isCompletionStarted: true,
        pressLift: 0.5,
      }),
    ).toBeCloseTo(1.03);
  });
  it("ranks a held press over hover over pointer-over", () => {
    expect(
      interactionScaleFor({ ...rest, pressLift: 1, isPointerOver: true }),
    ).toBe(PRESS_SCALE);
    expect(interactionScaleFor({ ...rest, isHovered: true })).toBe(
      COMPANION_HOVER_SCALE,
    );
    expect(interactionScaleFor({ ...rest, isPointerOver: true })).toBe(1.04);
    expect(interactionScaleFor(rest)).toBe(1);
  });
  it("lifts gradually as the press eases in, never in one step", () => {
    expect(interactionScaleFor({ ...rest, pressLift: 0.5 })).toBeCloseTo(1.03);
    expect(interactionScaleFor({ ...rest, pressLift: 2 })).toBe(PRESS_SCALE);
  });
});
