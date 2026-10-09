import { readFileSync } from "fs";
import { resolve } from "path";
import {
  nightStarCount,
  nightStarsLayerAt,
  starVisibilityAt,
} from "./nightStarField";

const scssStars = (): string => {
  const scss = readFileSync(
    resolve(process.cwd(), "src/styles/_variables.scss"),
    "utf8",
  );
  const line = scss.split("\n").find((l) => l.includes("--night-stars: url("));
  return line!
    .trim()
    .replace(/^--night-stars: /, "")
    .replace(/;$/, "");
};

const circles = (layer: string) => layer.match(/<circle /g)?.length ?? 0;
const opacities = (layer: string) =>
  [...layer.matchAll(/opacity='([\d.]+)'/g)].map((m) => Number(m[1]));

describe("nightStarField", () => {
  it("rebuilds the stylesheet's hand-placed field exactly at true night", () => {
    expect(nightStarsLayerAt(1)).toBe(scssStars());
    expect(nightStarCount()).toBe(circles(scssStars()));
  });

  it("shows no stars before the twilight starts", () => {
    expect(nightStarsLayerAt(0)).toBe("none");
  });

  it("brings the stars out one by one as the twilight deepens", () => {
    let prev = 0;
    for (let d = 0.05; d <= 1.0001; d += 0.05) {
      const n = circles(nightStarsLayerAt(d));
      expect(n).toBeGreaterThanOrEqual(prev);
      prev = n;
    }
    const early = circles(nightStarsLayerAt(0.1));
    expect(early).toBeGreaterThan(0);
    expect(early).toBeLessThan(nightStarCount() * 0.2);
  });

  it("brightest first: the earliest stars are the field's brightest", () => {
    const all = opacities(nightStarsLayerAt(1));
    const first = nightStarsLayerAt(0.05);
    const firstFull = nightStarsLayerAt(0.25); // the first ones fully in
    const fieldMedian = [...all].sort((a, b) => a - b)[all.length >> 1];
    expect(circles(first)).toBeGreaterThan(0);
    for (const o of opacities(firstFull).filter((o) => o >= 0.4)) {
      expect(o).toBeGreaterThan(fieldMedian);
    }
  });

  it("fades each star in over a stretch of twilight, never a pop", () => {
    expect(starVisibilityAt(0, 0)).toBe(0);
    expect(starVisibilityAt(0, 0.1)).toBeCloseTo(0.5);
    expect(starVisibilityAt(0, 0.2)).toBeCloseTo(1);
    expect(starVisibilityAt(1, 0.8)).toBe(0);
    expect(starVisibilityAt(1, 0.9)).toBeCloseTo(0.5);
    expect(starVisibilityAt(1, 1)).toBe(1);
  });
});
