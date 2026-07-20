import {
  calculateDragColorTemperature,
  getSunReleaseAction,
  hasVerticalCompletionIntent,
  isCompanionReanchorSettle,
  isSunActivationKey,
  shouldAcceptSunPointerStart,
  shouldResetTerminalStateForSettle,
  shouldSnapCompanionReanchor,
} from "./sunAnimationUtils";
import { sunCompanionSettle } from "./sunSettle";

describe("sun animation utils", () => {
  describe("hasVerticalCompletionIntent", () => {
    it("allows vertical and balanced diagonal gestures", () => {
      expect(hasVerticalCompletionIntent({ x: 0, y: 120 })).toBe(true);
      expect(hasVerticalCompletionIntent({ x: 80, y: -120 })).toBe(true);
      expect(hasVerticalCompletionIntent({ x: 120, y: 120 })).toBe(true);
    });

    it("blocks horizontal-dominant gestures", () => {
      expect(hasVerticalCompletionIntent({ x: 160, y: 80 })).toBe(false);
      expect(hasVerticalCompletionIntent({ x: -220, y: 100 })).toBe(false);
      expect(hasVerticalCompletionIntent({ x: 220, y: 0 })).toBe(false);
    });
  });

  describe("getSunReleaseAction", () => {
    it("snaps back for horizontal-dominant over-threshold drags", () => {
      expect(
        getSunReleaseAction({
          offset: { x: 160, y: 120 },
          velocity: { x: 0, y: 0, magnitude: 0 },
          isDragEnabled: true,
        }),
      ).toEqual({ type: "snapBack" });
    });

    it("snaps back for horizontal-dominant high-speed releases", () => {
      expect(
        getSunReleaseAction({
          offset: { x: 160, y: 80 },
          velocity: { x: 500, y: 100, magnitude: 510 },
          isDragEnabled: true,
        }),
      ).toEqual({ type: "snapBack" });
    });

    it("does not fall through to slow drag after a horizontal flick release", () => {
      expect(
        getSunReleaseAction({
          offset: { x: 40, y: 140 },
          velocity: { x: 300, y: 20, magnitude: 301 },
          isDragEnabled: true,
        }),
      ).toEqual({ type: "snapBack" });
    });

    it("completes a vertical drag past the threshold", () => {
      expect(
        getSunReleaseAction({
          offset: { x: 80, y: 120 },
          velocity: { x: 0, y: 0, magnitude: 0 },
          isDragEnabled: true,
        }),
      ).toEqual({ type: "dragComplete", direction: "down" });
    });

    it("snaps back for short high-speed vertical releases", () => {
      expect(
        getSunReleaseAction({
          offset: { x: 20, y: -60 },
          velocity: { x: 20, y: -240, magnitude: 241 },
          isDragEnabled: true,
        }),
      ).toEqual({ type: "snapBack" });
    });

    it("flings when the release velocity is vertical after enough movement", () => {
      expect(
        getSunReleaseAction({
          offset: { x: 20, y: -80 },
          velocity: { x: 20, y: -240, magnitude: 241 },
          isDragEnabled: true,
        }),
      ).toEqual({ type: "fling", direction: "up" });
    });

    it("honors down-only completion", () => {
      expect(
        getSunReleaseAction({
          offset: { x: 20, y: -120 },
          velocity: { x: 0, y: 0, magnitude: 0 },
          isDragEnabled: true,
          completionDirection: "down",
        }),
      ).toEqual({ type: "snapBack" });
    });
  });

  describe("calculateDragColorTemperature", () => {
    it("does not warm the sun during downward sunset drags", () => {
      expect(calculateDragColorTemperature("down", 120)).toBe(0);
    });

    it("keeps the existing cool feedback for upward drags", () => {
      expect(calculateDragColorTemperature("up", 50)).toBe(-0.5);
      expect(calculateDragColorTemperature("up", 160)).toBe(-1);
    });

    it("keeps color neutral without a vertical drag direction", () => {
      expect(calculateDragColorTemperature("none", 80)).toBe(0);
    });
  });

  describe("shouldAcceptSunPointerStart", () => {
    it("accepts a gesture only on a settled, non-exiting disc", () => {
      expect(
        shouldAcceptSunPointerStart({
          isCompletionStarted: false,
          isSettlingIntoRole: false,
        }),
      ).toBe(true);
    });

    it("ignores a tap while a role-transition glide is still in flight", () => {
      // The regression guard: tapping the disc as it glides from the bottom-bar
      // companion up into the interactive form must not take the glide over and
      // strand it full-size - it stays inert until the glide lands.
      expect(
        shouldAcceptSunPointerStart({
          isCompletionStarted: false,
          isSettlingIntoRole: true,
        }),
      ).toBe(false);
    });

    it("ignores a gesture once a completion animation has started", () => {
      expect(
        shouldAcceptSunPointerStart({
          isCompletionStarted: true,
          isSettlingIntoRole: false,
        }),
      ).toBe(false);
    });

    it("stays inert when both exit states are active", () => {
      expect(
        shouldAcceptSunPointerStart({
          isCompletionStarted: true,
          isSettlingIntoRole: true,
        }),
      ).toBe(false);
    });
  });

  describe("shouldSnapCompanionReanchor", () => {
    const companionRest = (restScale: number) => ({
      isCompanion: true,
      restScale,
    });

    it("snaps an anchor-only companion correction", () => {
      expect(
        shouldSnapCompanionReanchor(
          companionRest(0.52),
          companionRest(0.52),
          companionRest(0.52),
        ),
      ).toBe(true);
    });

    it("glides when a centred bottom-pinned rest also changes scale", () => {
      expect(
        shouldSnapCompanionReanchor(
          companionRest(0.38),
          companionRest(1),
          companionRest(1),
        ),
      ).toBe(false);
    });

    it("does not classify a same-size onboarding hero as the companion", () => {
      expect(
        isCompanionReanchorSettle({
          anchorYPxFromBottom: 240,
          scale: 1,
          breathe: false,
        }),
      ).toBe(false);
    });

    it("recognises only an explicitly identified companion settle", () => {
      expect(isCompanionReanchorSettle(sunCompanionSettle(44))).toBe(true);
    });

    it("keeps terminal reset semantics for an onboarding rest without treating it as a reanchorable companion", () => {
      const onboardingRest = {
        anchorYPxFromBottom: 240,
        scale: 1,
        breathe: false,
      };

      expect(shouldResetTerminalStateForSettle(onboardingRest)).toBe(true);
      expect(isCompanionReanchorSettle(onboardingRest)).toBe(false);
    });
  });

  describe("isSunActivationKey", () => {
    it("accepts the native button activation keys", () => {
      expect(isSunActivationKey("Enter")).toBe(true);
      expect(isSunActivationKey(" ")).toBe(true);
    });

    it("ignores unrelated keys", () => {
      expect(isSunActivationKey("ArrowDown")).toBe(false);
    });
  });
});
