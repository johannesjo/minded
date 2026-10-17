import * as fs from "fs";
import * as path from "path";
import {
  SKY_TURN_FACE_MS,
  SKY_TURN_MS,
  skyTurnDirectionFor,
  skyTurnFaceDelayMs,
  SKY_TURN_CLASS,
  SKY_TURN_EASING,
  SKY_TURN_SWEEP_CLASS,
  skyTurnFrontReach,
  skyTurnMask,
  skyTurnStylesheet,
  skyTurnVars,
  timeForEasedProgress,
} from "./skyTurn";

// A portrait phone.
const W = 390;
const H = 844;

const px = (value: string) => value.split(" ").map((v) => parseFloat(v));

describe("skyTurnMask", () => {
  it("nightfall slides the tall mask from all-old to all-new", () => {
    const mask = skyTurnMask("nightfall", 400, 800);
    expect(mask.image).toMatch(/^linear-gradient\(to bottom/);
    expect(mask.from.position).toBe("0% 100%");
    expect(mask.to.position).toBe("0% 0%");
  });

  it("daybreak grows a dome pinned to the bottom centre", () => {
    const width = 400;
    const height = 800;
    const mask = skyTurnMask("daybreak", width, height);
    expect(px(mask.from.size)).toEqual([0, 0]);
    for (const frame of [mask.from, mask.to]) {
      const [w, h] = px(frame.size);
      const [left, top] = px(frame.position);
      expect(left + w / 2).toBeCloseTo(width / 2, 0);
      expect(top + h / 2).toBeCloseTo(height, 0);
    }
  });

  it.each([
    [390, 844],
    [1440, 900],
  ])(
    "daybreak's core covers the far top corners when it lands (%i×%i)",
    (width, height) => {
      const mask = skyTurnMask("daybreak", width, height);
      const [w, h] = px(mask.to.size);
      // Normalised ellipse distance of a top corner from the dome's centre.
      const r = Math.hypot(width / 2 / (w / 2), height / (h / 2));
      const core = parseFloat(/#000 ([\d.]+)%/.exec(mask.image)![1]) / 100;
      expect(r).toBeLessThan(core);
      // A broad arc, not a tall flame - even on a portrait phone.
      expect(w).toBeGreaterThan(h);
    },
  );
});

/** The two stops of a mask gradient: opaque up to `core`, clear from `edge`. */
const stops = (image: string) => {
  const [core, edge] = [...image.matchAll(/([\d.]+)%/g)].map(
    (m) => parseFloat(m[1]) / 100,
  );
  return { core, edge };
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

describe("the front the delay maths assumes is the mask's own", () => {
  it.each([0.1, 0.5, 0.93])(
    "nightfall's feather midpoint sits at y=%f when the reach says so",
    (y) => {
      const mask = skyTurnMask("nightfall", W, H);
      const e = skyTurnFrontReach("nightfall", y, W, H);
      const maskH = parseFloat(mask.from.size.split(" ")[1]) / 100; // in H
      // A percentage position offsets the mask by (1 - maskH) * p.
      const p = lerp(1, 0, e);
      const top = (1 - maskH) * p;
      const { core, edge } = stops(mask.image);
      expect(top + ((core + edge) / 2) * maskH).toBeCloseTo(y, 5);
    },
  );

  it.each([0.2, 0.5, 0.93])(
    "daybreak's feather midpoint reaches y=%f when the reach says so",
    (y) => {
      const mask = skyTurnMask("daybreak", W, H);
      const e = skyTurnFrontReach("daybreak", y, W, H);
      const ry = (px(mask.to.size)[1] / 2) * e;
      const { core, edge } = stops(mask.image);
      expect(H - ((core + edge) / 2) * ry).toBeCloseTo(y * H, 0);
    },
  );
});

describe("skyTurnVars + skyTurnStylesheet", () => {
  const css = skyTurnStylesheet();
  const vars = skyTurnVars("daybreak", W, H);

  it("feeds every variable the stylesheet reads", () => {
    const read = new Set(
      [...css.matchAll(/var\((--sky-turn-[\w-]+)\)/g)].map((m) => m[1]),
    );
    expect([...read].sort()).toEqual(Object.keys(vars).sort());
  });

  it("carries the -webkit-mask twins (WebViews with only the prefixed mask)", () => {
    for (const prop of ["image", "repeat", "size", "position"]) {
      expect(css).toContain(`-webkit-mask-${prop}:`);
      expect(css).toMatch(new RegExp(`[^-]mask-${prop}:`));
    }
  });

  it("turns off every capture's UA animation and hides old suns", () => {
    expect(css).toContain(
      `html.${SKY_TURN_CLASS}::view-transition-group(*) { animation: none; }`,
    );
    expect(css).toMatch(
      /::view-transition-old\(\*\) \{ animation: none; opacity: 0; \}/,
    );
    // ...but the old sky itself stays whole under the sweep.
    expect(css).toMatch(
      new RegExp(
        `html\\.${SKY_TURN_CLASS}\\.${SKY_TURN_SWEEP_CLASS}::view-transition-old\\(root\\) \\{ opacity: 1;`,
      ),
    );
  });

  it("dissolves on the turn's beat where it can't mask", () => {
    expect(css).toMatch(
      /:not\(\.minded-sky-turn-sweep\)::view-transition-new\(root\)[^}]*minded-sky-turn-fade-in/,
    );
  });
});

describe("skyTurnFrontReach", () => {
  it("nightfall reaches the zenith first and the horizon last", () => {
    expect(skyTurnFrontReach("nightfall", 0, W, H)).toBeLessThan(
      skyTurnFrontReach("nightfall", 0.5, W, H),
    );
    expect(skyTurnFrontReach("nightfall", 0.5, W, H)).toBeCloseTo(0.5, 5);
    expect(skyTurnFrontReach("nightfall", 1, W, H)).toBeLessThan(1);
  });

  it("daybreak reaches the horizon first and the zenith last", () => {
    expect(skyTurnFrontReach("daybreak", 1, W, H)).toBe(0);
    expect(skyTurnFrontReach("daybreak", 0, W, H)).toBeGreaterThan(
      skyTurnFrontReach("daybreak", 0.5, W, H),
    );
  });
});

describe("skyTurnFaceDelayMs", () => {
  // Where the companion rests (the bottom bar) and the intervention sun.
  const COMPANION_Y = 0.93;
  const CENTRE_Y = 0.5;

  it("keeps the face turn inside the sky turn", () => {
    for (const direction of ["nightfall", "daybreak"] as const) {
      for (let y = 0; y <= 1; y += 0.05) {
        const delay = skyTurnFaceDelayMs(direction, y, W, H);
        expect(delay).toBeGreaterThanOrEqual(0);
        expect(delay + SKY_TURN_FACE_MS).toBeLessThanOrEqual(SKY_TURN_MS);
      }
    }
  });

  it("turns the resting companion late at nightfall, at once at daybreak", () => {
    expect(skyTurnFaceDelayMs("nightfall", COMPANION_Y, W, H)).toBeGreaterThan(
      skyTurnFaceDelayMs("nightfall", CENTRE_Y, W, H),
    );
    expect(skyTurnFaceDelayMs("daybreak", COMPANION_Y, W, H)).toBe(0);
  });

  it("centres a mid-screen sun's turn on the front passing it", () => {
    // Nightfall's front crosses the middle halfway through the turn.
    expect(skyTurnFaceDelayMs("nightfall", CENTRE_Y, W, H)).toBe(
      SKY_TURN_MS / 2 - SKY_TURN_FACE_MS / 2,
    );
  });
});

describe("timeForEasedProgress", () => {
  it("inverts a symmetric curve", () => {
    expect(timeForEasedProgress(0)).toBeCloseTo(0, 5);
    expect(timeForEasedProgress(0.5)).toBeCloseTo(0.5, 5);
    expect(timeForEasedProgress(1)).toBeCloseTo(1, 5);
    // An in-out curve is slow at the ends: little progress takes a while.
    expect(timeForEasedProgress(0.1)).toBeGreaterThan(0.1);
  });
});

describe("skyTurnDirectionFor", () => {
  it("names the flip by where it lands", () => {
    expect(skyTurnDirectionFor(true)).toBe("nightfall");
    expect(skyTurnDirectionFor(false)).toBe("daybreak");
  });
});

describe("the face beat mirrors the stylesheet", () => {
  it("--ease-sky-turn is SKY_TURN_EASING", () => {
    const scss = fs.readFileSync(
      path.join(__dirname, "../../styles/_variables.scss"),
      "utf8",
    );
    expect(scss).toContain(`--ease-sky-turn: ${SKY_TURN_EASING};`);
  });

  it("--dur-sky-turn is SKY_TURN_FACE_MS", () => {
    const scss = fs.readFileSync(
      path.join(__dirname, "../../styles/_variables.scss"),
      "utf8",
    );
    expect(scss).toMatch(
      new RegExp(`--dur-sky-turn:\\s*${SKY_TURN_FACE_MS}ms;`),
    );
    expect(scss).toMatch(/--dur-sky-turn:\s*0ms;/);
  });
});

describe("the disc turns as one with the sky", () => {
  const sunScss = fs.readFileSync(
    path.join(__dirname, "../components/interaction/sun/Sun.scss"),
    "utf8",
  );

  it.each([
    [
      "the moon face",
      /\.moon-face \{[^}]*transition: opacity var\(--dur-sky-turn\) var\(--ease-sky-turn\)\s+var\(--sky-turn-delay, 0ms\)/,
    ],
    [
      "the moon's pool",
      /&\.is-variant-morphing::after \{[^}]*var\(--sky-turn-delay, 0ms\)/,
    ],
    [
      "the light on the sky",
      /&\.is-variant-morphing > \.sun-light \{[^}]*var\(--sky-turn-delay, 0ms\)/,
    ],
  ])("%s waits for the front (--sky-turn-delay)", (_, rule) => {
    expect(sunScss).toMatch(rule);
  });
});

describe("the disc never goes translucent mid-turn", () => {
  const sunScss = fs.readFileSync(
    path.join(__dirname, "../components/interaction/sun/Sun.scss"),
    "utf8",
  );

  it("holds the sun face opaque until the moon face has fully covered it", () => {
    // Every `.moon .sun-face` rule swaps its opacity only after the moon
    // face's whole (delayed) fade - never fading the two layers together.
    const rules = [
      ...sunScss.matchAll(
        /&(?:\.is-variant-morphing)?\.moon \.sun-face \{([^}]*)\}/g,
      ),
    ];
    expect(rules.length).toBeGreaterThanOrEqual(2);
    for (const [, body] of rules) {
      expect(body).toMatch(
        /opacity 0s calc\(var\(--sky-turn-delay, 0ms\) \+ var\(--dur-sky-turn\)\)/,
      );
    }
  });
});
