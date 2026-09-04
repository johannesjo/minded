import {
  anchorPointForSettle,
  DEFAULT_ANCHOR_Y_RATIO,
  DEFAULT_REST_SCALE,
  parseRenderedTranslate,
  restScaleForSettle,
} from "./sunGeometry";

const viewport = { width: 400, height: 800 };

describe("sunGeometry", () => {
  describe("parseRenderedTranslate", () => {
    it("reads the translate a previous frame wrote", () => {
      expect(
        parseRenderedTranslate("translate(12.5px, -3px) scale(0.8)"),
      ).toEqual({ x: 12.5, y: -3 });
    });
    it("is null when no translate is set", () => {
      expect(parseRenderedTranslate("")).toBeNull();
      expect(parseRenderedTranslate("scale(1)")).toBeNull();
    });
  });

  describe("anchorPointForSettle", () => {
    it("defaults to centred x and the default y ratio", () => {
      expect(anchorPointForSettle({}, viewport)).toEqual({
        x: 200,
        y: 800 * DEFAULT_ANCHOR_Y_RATIO,
      });
    });
    it("lets a fixed px x win over centring, and a ratio x win over px", () => {
      expect(anchorPointForSettle({ anchorXPx: 40 }, viewport).x).toBe(40);
      expect(
        anchorPointForSettle({ anchorXPx: 40, anchorXRatio: 0.25 }, viewport).x,
      ).toBe(100);
    });
    it("resolves y from the bottom, then the top, then the ratio", () => {
      expect(
        anchorPointForSettle({ anchorYPxFromBottom: 44 }, viewport).y,
      ).toBe(756);
      expect(anchorPointForSettle({ anchorYPxFromTop: 30 }, viewport).y).toBe(
        30,
      );
      expect(
        anchorPointForSettle(
          { anchorYPxFromBottom: 44, anchorYPxFromTop: 30 },
          viewport,
        ).y,
      ).toBe(756);
      expect(anchorPointForSettle({ anchorYRatio: 0.5 }, viewport).y).toBe(400);
    });
  });

  describe("restScaleForSettle", () => {
    it("pins a disc diameter to a scale of the base disc", () => {
      expect(restScaleForSettle({ discPx: 30, scale: 0.5 }, 120)).toBe(0.25);
    });
    it("falls back to the settle's scale, then the default", () => {
      expect(restScaleForSettle({ scale: 0.5 }, 120)).toBe(0.5);
      expect(restScaleForSettle({}, 120)).toBe(DEFAULT_REST_SCALE);
    });
  });
});
