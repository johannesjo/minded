import {
  getOnboardingSunSettle,
  ONBOARDING_SKY_SUN_SCALE,
  OnboardingSunAnchors,
  OnboardingSunState,
} from "./onboardingSunSettle";

const anchors = (
  overrides: Partial<OnboardingSunAnchors> = {},
): OnboardingSunAnchors => ({
  heroYFromBottom: 400,
  skyYFromBottom: 700,
  companionYFromBottom: 64,
  ...overrides,
});

const state = (
  overrides: Partial<OnboardingSunState> = {},
): OnboardingSunState => ({
  step: 0,
  isLeaving: false,
  isAwaitingLift: false,
  isPermissionNotGiven: false,
  ...overrides,
});

describe("getOnboardingSunSettle", () => {
  it("rests full-size on the hero slot for the welcome step", () => {
    expect(getOnboardingSunSettle(state(), anchors())).toEqual({
      anchorYPxFromBottom: 400,
      scale: 1,
      breathe: false,
    });
  });

  it("has no target on the welcome step until the hero slot is measured (no centre-flash)", () => {
    expect(
      getOnboardingSunSettle(state(), anchors({ heroYFromBottom: null })),
    ).toBeNull();
  });

  it("rests small in the sky through the setup chores (steps 1-3)", () => {
    for (const step of [1, 2, 3]) {
      expect(getOnboardingSunSettle(state({ step }), anchors())).toEqual({
        anchorYPxFromBottom: 700,
        scale: ONBOARDING_SKY_SUN_SCALE,
        breathe: false,
      });
    }
  });

  it("returns to the hero slot on the closing 'ready' step", () => {
    expect(getOnboardingSunSettle(state({ step: 4 }), anchors())).toEqual({
      anchorYPxFromBottom: 400,
      scale: 1,
      breathe: false,
    });
  });

  it("keeps the sky rest on step 4 until its hero slot is measured", () => {
    expect(
      getOnboardingSunSettle(
        state({ step: 4 }),
        anchors({ heroYFromBottom: null }),
      ),
    ).toEqual({
      anchorYPxFromBottom: 700,
      scale: ONBOARDING_SKY_SUN_SCALE,
      breathe: false,
    });
  });

  it("stays in the sky on step 4's denied branch (no hero slot there)", () => {
    expect(
      getOnboardingSunSettle(
        state({ step: 4, isPermissionNotGiven: true }),
        anchors(),
      ),
    ).toEqual({
      anchorYPxFromBottom: 700,
      scale: ONBOARDING_SKY_SUN_SCALE,
      breathe: false,
    });
  });

  it("glides to the companion rest for the dashboard hand-off, from any step", () => {
    for (const step of [0, 2, 4]) {
      const settle = getOnboardingSunSettle(
        state({ step, isLeaving: true }),
        anchors(),
      );
      expect(settle?.anchorYPxFromBottom).toBe(64);
    }
  });

  it("starts at the companion rest on re-entry, so the disc rises out of the bar", () => {
    const settle = getOnboardingSunSettle(
      state({ step: 1, isAwaitingLift: true }),
      anchors(),
    );
    expect(settle?.anchorYPxFromBottom).toBe(64);
  });

  it("never pins an x anchor, so every rest keeps Sun's companion-style reset/heal semantics", () => {
    const all = [
      getOnboardingSunSettle(state(), anchors()),
      getOnboardingSunSettle(state({ step: 2 }), anchors()),
      getOnboardingSunSettle(state({ step: 4 }), anchors()),
      getOnboardingSunSettle(state({ isLeaving: true }), anchors()),
    ];
    for (const settle of all) {
      expect(settle?.anchorXPx).toBeUndefined();
      expect(settle?.anchorXRatio).toBeUndefined();
      expect(settle?.anchorYPxFromBottom).not.toBeNull();
    }
  });
});
