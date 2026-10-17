import * as fs from "fs";
import * as path from "path";
import {
  SKY_TURN_FACE_MS,
  SKY_TURN_MS,
  skyTurnDirectionFor,
  skyTurnFaceDelayMs,
  skyTurnFrontReach,
  skyTurnMaskFrames,
  timeForEasedProgress,
} from "./skyTurn";

// A portrait phone.
const W = 390;
const H = 844;

const px = (value: string) => value.split(" ").map((v) => parseFloat(v));

describe("skyTurnMaskFrames", () => {
  it("nightfall slides the tall mask from all-old to all-new", () => {
    const [from, to] = skyTurnMaskFrames("nightfall", 400, 800);
    expect(from.maskImage).toBe(to.maskImage);
    expect(from.maskImage).toMatch(/^linear-gradient\(to bottom/);
    expect(from.maskPosition).toBe("0% 100%");
    expect(to.maskPosition).toBe("0% 0%");
    // The -webkit- twins carry the same frame (older WebKit / WebView).
    expect(from.webkitMaskPosition).toBe(from.maskPosition);
    expect(to.webkitMaskImage).toBe(to.maskImage);
  });

  it("daybreak grows a dome pinned to the bottom centre", () => {
    const width = 400;
    const height = 800;
    const [from, to] = skyTurnMaskFrames("daybreak", width, height);
    expect(px(from.maskSize)).toEqual([0, 0]);
    for (const frame of [from, to]) {
      const [w, h] = px(frame.maskSize);
      const [left, top] = px(frame.maskPosition);
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
      const [, to] = skyTurnMaskFrames("daybreak", width, height);
      const [w, h] = px(to.maskSize);
      // Normalised ellipse distance of a top corner from the dome's centre.
      const r = Math.hypot(width / 2 / (w / 2), height / (h / 2));
      const core = parseFloat(/#000 ([\d.]+)%/.exec(to.maskImage)![1]) / 100;
      expect(r).toBeLessThan(core);
      // A broad arc, not a tall flame - even on a portrait phone.
      expect(w).toBeGreaterThan(h);
    },
  );
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
