import {
  COMPANION_HOVER_SCALE,
  interactionScaleFor,
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
    isDragging: false,
    isHovered: false,
    isPointerOver: false,
  };
  it("is neutral once a completion has started, whatever else is true", () => {
    expect(
      interactionScaleFor({
        ...rest,
        isCompletionStarted: true,
        isDragging: true,
      }),
    ).toBe(1);
  });
  it("ranks drag over hover over pointer-over", () => {
    expect(
      interactionScaleFor({ ...rest, isDragging: true, isHovered: true }),
    ).toBe(1.06);
    expect(interactionScaleFor({ ...rest, isHovered: true })).toBe(
      COMPANION_HOVER_SCALE,
    );
    expect(interactionScaleFor({ ...rest, isPointerOver: true })).toBe(1.04);
    expect(interactionScaleFor(rest)).toBe(1);
  });
});
