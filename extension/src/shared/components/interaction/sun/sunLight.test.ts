import {
  MOON_LIGHT_LEVEL,
  SUN_LIGHT_SPREAD,
  sunLightInsetPct,
  sunLightLevel,
  sunLightRgb,
  sunLightStyle,
  sunLightTransition,
} from "./sunLight";
import {
  getSunSettleForPhase,
  sunArriveSettle,
  sunArriveSettleAt,
  sunCompanionSettle,
  sunDepartSettle,
  sunDepartSettleAt,
  sunInteractiveSettle,
  sunRestingSettle,
  type SunPhase,
} from "./sunSettle";
import { getSunSize } from "./sunAnimationUtils";
import type { SunSettle } from "./Sun";

const rgb = (triple: string): number[] =>
  triple.split(",").map((part) => Number(part.trim()));

// Every settle the app can hand the disc, including both corner hand-offs.
const ALL_SETTLES: Array<[string, SunSettle | null]> = [
  ["interactive (base)", null],
  ["interactive (measured)", sunInteractiveSettle({ x: 200, y: 300 })],
  ["resting (measured)", sunRestingSettle({ x: 200, y: 500 })],
  ["companion", sunCompanionSettle(44)],
  ["departing (web)", sunDepartSettle()],
  ["departing (android)", sunDepartSettleAt({ x: 0.1, y: 0.9 })],
  ["arriving (web)", sunArriveSettle()],
  ["arriving (android)", sunArriveSettleAt({ x: 0.1, y: 0.9 })],
  ...(
    [
      "companion",
      "breathing",
      "surfing",
      "resting",
      "departing",
      "dailyQuestionsSuccess",
    ] as SunPhase[]
  ).map((phase): [string, SunSettle | null] => [
    `phase ${phase}`,
    getSunSettleForPhase(phase),
  ]),
];

describe("sun light colour (the halo rule, for the light cast on the sky)", () => {
  it("is pure white for the sun", () => {
    expect(rgb(sunLightRgb("sun"))).toEqual([255, 255, 255]);
    // An unset variant is the sun.
    expect(rgb(sunLightRgb(undefined))).toEqual([255, 255, 255]);
  });

  it("is cool for the moon - never warm", () => {
    const [r, g, b] = rgb(sunLightRgb("moon"));
    // Cool means blue-leaning: blue at full, red the weakest channel. An amber
    // light (255,214,115) would invert this ordering.
    expect(b).toBe(255);
    expect(r).toBeLessThan(g);
    expect(g).toBeLessThan(b);
  });

  it("takes no warmth input, so no settle - not even departing - can warm it", () => {
    // The departing hand-off warms the *halo* (warmth: 1). The light's colour
    // is a function of the variant alone; prove the signature can't see warmth.
    expect(sunLightRgb.length).toBe(1);
    const departing = sunDepartSettle();
    expect(departing.warmth).toBe(1);
    expect(rgb(sunLightRgb("sun"))).toEqual([255, 255, 255]);
  });
});

describe("sunLightLevel", () => {
  it("lights the sky at full level on every in-app settle", () => {
    for (const [name, settle] of ALL_SETTLES) {
      if (settle?.discPx != null) continue;
      expect([name, sunLightLevel("sun", settle)]).toEqual([name, 1]);
    }
  });

  it("leaves with the sky on both corner hand-offs", () => {
    // Over someone else's app a white pool is just a pale smudge, and the sky it
    // fell on is dissolving (departing) or not yet back (arriving).
    for (const settle of [
      sunDepartSettle(),
      sunDepartSettleAt({ x: 0.2, y: 0.8 }),
      sunArriveSettle(),
      sunArriveSettleAt({ x: 0.2, y: 0.8 }),
    ]) {
      expect(sunLightLevel("sun", settle)).toBe(0);
      expect(sunLightLevel("moon", settle)).toBe(0);
    }
  });

  it("gives the moon a much fainter pool than the sun", () => {
    expect(sunLightLevel("moon", null)).toBe(MOON_LIGHT_LEVEL);
    expect(MOON_LIGHT_LEVEL).toBeGreaterThan(0);
    expect(MOON_LIGHT_LEVEL).toBeLessThanOrEqual(0.5);
  });

  it("is a pure function of variant + settle (no clock, nothing to drift)", () => {
    const settle = sunCompanionSettle(44);
    expect(sunLightLevel("sun", settle)).toBe(sunLightLevel("sun", settle));
  });
});

describe("sun light geometry", () => {
  it("is a centred square SUN_LIGHT_SPREAD disc diameters across", () => {
    for (const width of [360, 800, 1440]) {
      const disc = getSunSize(width).size;
      // Equal negative insets on all four sides of a disc-sized box: the pool's
      // centre is the disc's centre, so the light can't sit off the sun.
      const insetPx = (sunLightInsetPct() / 100) * disc;
      const left = insetPx;
      const right = disc - insetPx;
      expect((left + right) / 2).toBeCloseTo(disc / 2);
      expect(right - left).toBeCloseTo(disc * SUN_LIGHT_SPREAD);
    }
  });

  it("maps spread 1 to the disc itself", () => {
    expect(sunLightInsetPct(1)).toBeCloseTo(0);
  });

  it("stays a modest GPU layer on a dense phone screen", () => {
    // The pool is its own compositor layer for the life of the shell sun, so
    // bound its texture: smallest-breakpoint disc at a DPR-3 phone.
    const side = getSunSize(360).size * SUN_LIGHT_SPREAD * 3;
    const bytes = side * side * 4;
    expect(bytes).toBeLessThanOrEqual(8 * 1024 * 1024);
  });
});

describe("sunLightTransition", () => {
  it("fades on the sky's beat with the shared motion tokens", () => {
    expect(sunLightTransition(false)).toBe(
      "opacity var(--dur-sky) var(--ease-out)",
    );
  });

  it("does not animate at all under reduced motion", () => {
    expect(sunLightTransition(true)).toBe("none");
  });

  it("never animates anything but opacity (travel is the disc's)", () => {
    expect(sunLightTransition(false)).not.toMatch(
      /transform|inset|top|left|background/,
    );
  });
});

describe("sunLightStyle", () => {
  it("assembles a white, full-level, softly-fading pool for the in-app sun", () => {
    expect(
      sunLightStyle({ variant: "sun", settle: sunCompanionSettle(44) }, false),
    ).toEqual({
      inset: `${sunLightInsetPct()}%`,
      "--sun-light-rgb": "255, 255, 255",
      opacity: "1",
      transition: "opacity var(--dur-sky) var(--ease-out)",
    });
  });

  it("stays white while the departing halo warms, and fades out", () => {
    const style = sunLightStyle(
      { variant: "sun", settle: sunDepartSettle() },
      false,
    );
    expect(style["--sun-light-rgb"]).toBe("255, 255, 255");
    expect(style.opacity).toBe("0");
  });

  it("never animates under reduced motion", () => {
    expect(
      sunLightStyle({ variant: "moon", settle: null }, true).transition,
    ).toBe("none");
  });

  it("never sets a position, so it can only ever sit where the disc is", () => {
    const keys = Object.keys(
      sunLightStyle({ variant: "sun", settle: null }, false),
    );
    expect(keys).not.toEqual(
      expect.arrayContaining([expect.stringMatching(/transform|top|left/)]),
    );
  });
});
