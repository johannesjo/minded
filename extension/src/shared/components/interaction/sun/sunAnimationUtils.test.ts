import {
  calculateDragColorTemperature,
  getSunReleaseAction,
  hasVerticalCompletionIntent,
} from "./sunAnimationUtils";

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
});
