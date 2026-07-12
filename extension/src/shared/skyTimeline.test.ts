import {
  AMBIENT_SKY_KEYFRAMES,
  ambientSkyAccentsAt,
  ambientSkyColorsAt,
  ambientSkyGradient,
  ambientSkyLayeredBackground,
  duskTargetColorsAt,
  duskTargetGradientAt,
  hexToRgbChannels,
  parseSkyHourParam,
  zenithTargetColorsAt,
} from "./skyTimeline";

describe("skyTimeline", () => {
  describe("ambientSkyColorsAt", () => {
    it("pins the 9:00 morning keyframe to the classic static sky (brand anchor)", () => {
      // These are the --c-gradient-1..4 values in _variables.scss. If this
      // fails, either the tokens or the keyframe changed without the other.
      expect(ambientSkyColorsAt(9)).toEqual([
        "#cfe4f5",
        "#d8ecd6",
        "#f5efc8",
        "#f6dcd2",
      ]);
    });

    it("returns exact keyframe colors at every keyframe hour", () => {
      for (const kf of AMBIENT_SKY_KEYFRAMES) {
        expect(ambientSkyColorsAt(kf.hour)).toEqual(kf.colors);
      }
    });

    it("interpolates halfway between adjacent keyframes", () => {
      // dawn c1 #c9d3ea → morning c1 #cfe4f5, midpoint at 7:30
      expect(ambientSkyColorsAt(7.5)[0]).toBe("#ccdcf0");
    });

    it("clamps hours outside the light window to its edges", () => {
      const dawn = AMBIENT_SKY_KEYFRAMES[0];
      const dusk = AMBIENT_SKY_KEYFRAMES[AMBIENT_SKY_KEYFRAMES.length - 1];
      expect(ambientSkyColorsAt(3)).toEqual(dawn.colors);
      expect(ambientSkyColorsAt(23)).toEqual(dusk.colors);
    });
  });

  describe("ambientSkyAccentsAt", () => {
    it("pins the 9:00 morning accents to the _variables.scss defaults", () => {
      // These are the --day-zenith-rgb / --day-horizon-glow-rgb defaults in
      // _variables.scss. If this fails, either the tokens or the keyframe
      // changed without the other.
      const morning = ambientSkyAccentsAt(9);
      expect(hexToRgbChannels(morning.zenith)).toBe("176, 208, 236");
      expect(hexToRgbChannels(morning.horizonGlow)).toBe("255, 240, 205");
    });

    it("returns exact accents at every keyframe hour and clamps outside", () => {
      for (const kf of AMBIENT_SKY_KEYFRAMES) {
        expect(ambientSkyAccentsAt(kf.hour)).toEqual(kf.accents);
      }
      expect(ambientSkyAccentsAt(3)).toEqual(AMBIENT_SKY_KEYFRAMES[0].accents);
      expect(ambientSkyAccentsAt(23)).toEqual(
        AMBIENT_SKY_KEYFRAMES[AMBIENT_SKY_KEYFRAMES.length - 1].accents,
      );
    });

    it("interpolates between keyframes like the base colors do", () => {
      // dawn zenith #a8b4d8 → morning zenith #b0d0ec, midpoint at 7:30
      expect(ambientSkyAccentsAt(7.5).zenith).toBe("#acc2e2");
    });
  });

  describe("drag targets", () => {
    it("keeps the classic sunset all day until the dusk blend starts", () => {
      const classic = ["#4f78bb", "#f49f73", "#ffd36a", "#ef6f63"];
      expect(duskTargetColorsAt(9)).toEqual(classic);
      expect(duskTargetColorsAt(17)).toEqual(classic);
    });

    it("reaches the deep dusk target at the night boundary", () => {
      expect(duskTargetColorsAt(19)).toEqual([
        "#2b3f70",
        "#b0687a",
        "#e69a55",
        "#a94f57",
      ]);
      // and holds it past the boundary (stale light-mode tab)
      expect(duskTargetColorsAt(22)).toEqual(duskTargetColorsAt(19));
    });

    it("blends monotonically toward night between 17:00 and 19:00", () => {
      // top stop darkens: classic #4f78bb → deep dusk #2b3f70
      const red = (c: string) => parseInt(c.slice(1, 3), 16);
      const at17 = red(duskTargetColorsAt(17)[0]);
      const at18 = red(duskTargetColorsAt(18)[0]);
      const at19 = red(duskTargetColorsAt(19)[0]);
      expect(at18).toBeLessThan(at17);
      expect(at19).toBeLessThan(at18);
    });

    it("dims the zenith blue toward evening in the same window", () => {
      expect(zenithTargetColorsAt(12)).toEqual(["#0058c1", "#0a75bc"]);
      expect(zenithTargetColorsAt(19)).toEqual(["#16305f", "#2a4f7d"]);
    });
  });

  describe("gradient builders", () => {
    it("builds the ambient gradient with the _variables.scss stop positions", () => {
      const g = ambientSkyGradient([
        "#111111",
        "#222222",
        "#333333",
        "#444444",
      ]);
      expect(g).toBe(
        "linear-gradient(to bottom, #111111 0%, #111111 18%, #222222 36%, #333333 54%, #444444 100%)",
      );
    });

    it("builds the dusk gradient with the sunset stop positions", () => {
      expect(duskTargetGradientAt(12)).toBe(
        "linear-gradient(to bottom, #4f78bb 0%, #4f78bb 14%, #f49f73 54%, #ffd36a 78%, #ef6f63 100%)",
      );
    });

    it("layers the day sky as bloom, veil, dome, base (mirrors _variables.scss)", () => {
      const bg = ambientSkyLayeredBackground(
        ["#111111", "#222222", "#333333", "#444444"],
        { zenith: "#b0d0ec", horizonGlow: "#fff0cd" },
      );
      expect(bg).toBe(
        [
          "radial-gradient(ellipse 90% 32% at 50% 108%, rgba(255, 240, 205, 0.65) 0%, rgba(255, 240, 205, 0.3) 48%, transparent 78%)",
          "var(--day-veil)",
          "radial-gradient(ellipse 130% 52% at 50% -14%, rgba(176, 208, 236, 0.55) 0%, rgba(176, 208, 236, 0.22) 55%, transparent 80%)",
          "linear-gradient(to bottom, #111111 0%, #111111 18%, #222222 36%, #333333 54%, #444444 100%)",
        ].join(", "),
      );
    });
  });

  describe("hexToRgbChannels", () => {
    it("converts #rrggbb to bare rgb components", () => {
      expect(hexToRgbChannels("#000000")).toBe("0, 0, 0");
      expect(hexToRgbChannels("#ffffff")).toBe("255, 255, 255");
      expect(hexToRgbChannels("#f6dcd2")).toBe("246, 220, 210");
    });
  });

  describe("parseSkyHourParam", () => {
    it("parses fractional hours and HH:MM", () => {
      expect(parseSkyHourParam("?skyHour=17.5")).toBe(17.5);
      expect(parseSkyHourParam("?skyHour=17:30")).toBe(17.5);
      expect(parseSkyHourParam("?skyHour=0")).toBe(0);
    });

    it("returns null when absent or invalid", () => {
      expect(parseSkyHourParam("")).toBeNull();
      expect(parseSkyHourParam("?theme=dark")).toBeNull();
      expect(parseSkyHourParam("?skyHour=abc")).toBeNull();
      expect(parseSkyHourParam("?skyHour=24")).toBeNull();
      expect(parseSkyHourParam("?skyHour=-1")).toBeNull();
    });

    it("rejects malformed HH:MM values", () => {
      expect(parseSkyHourParam("?skyHour=18:")).toBeNull();
      expect(parseSkyHourParam("?skyHour=:30")).toBeNull();
      expect(parseSkyHourParam("?skyHour=12:90")).toBeNull();
      expect(parseSkyHourParam("?skyHour=12:-30")).toBeNull();
      expect(parseSkyHourParam("?skyHour=12:xx")).toBeNull();
    });
  });
});
