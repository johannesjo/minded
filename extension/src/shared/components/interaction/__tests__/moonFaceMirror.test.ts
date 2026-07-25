import { readFileSync } from "fs";
import { resolve } from "path";

/**
 * The moon's face, enforced across the language boundary.
 *
 * `.moon-face` (Sun.scss) draws the moon with a shaded body under seven soft
 * maria. The two home-screen widgets draw the same moon from the same numbers -
 * once as an Android VectorDrawable, once in SwiftUI - because there is only ever
 * one moon, and a widget that disagreed with the app would read as a second
 * object on the user's home screen.
 *
 * That is 7 maria x 6 values, hand-derived into two other languages under two
 * different mappings, plus the body gradient. Nothing enforced it. This does.
 *
 * The mappings under test:
 *   - Android works in a 108 viewport where the disc is r=36 about (54,54), so
 *     the face's box is 18..90 and `coord = 18 + pct * 72`, `radius = pct * 72`.
 *   - A VectorDrawable radial gradient is always circular, so each mare is a
 *     circle of radius `ry` squashed by its group's `scaleX = rx / ry`, pivoted
 *     at the mare's own centre. iOS does the same with `scaleEffect`.
 *   - Android colours are #AARRGGBB; iOS keeps the CSS fractions verbatim.
 *
 * Sibling to sunHaloMirror.test.ts (the halo rule) and widgetClockMirror /
 * widgetPromptsMirror. jest runs with cwd = extension/, so android/ is one up
 * and ios/ is here.
 */

const WEB = "src/shared/components/interaction/sun/Sun.scss";
const ANDROID = "../android/app/src/main/res/drawable/ic_sun_widget_night.xml";
const IOS = "ios/App/MindedWidget/CompanionSun.swift";

const read = (relPath: string): string =>
  readFileSync(resolve(process.cwd(), relPath), "utf8");

/** The disc the widgets draw the face onto, in Android viewport units. */
const DISC_ORIGIN = 18;
const DISC_DIAMETER = 72;

type Mare = {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  alpha: number;
  fade: number;
};

/** The seven `ellipse` layers of `.moon-face`'s background, in paint order. */
const webMaria = (scss: string): Mare[] => {
  const face = scss.slice(scss.indexOf("  .moon-face {"));
  const re =
    /ellipse\s+([\d.]+)%\s+([\d.]+)%\s+at\s+([\d.]+)%\s+([\d.]+)%,\s*rgba\(\s*(\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\s*\)\s*0%,\s*rgba\([^)]*\)\s*([\d.]+)%/g;
  return [...face.matchAll(re)].map((m) => ({
    rx: Number(m[1]) / 100,
    ry: Number(m[2]) / 100,
    cx: Number(m[3]) / 100,
    cy: Number(m[4]) / 100,
    alpha: Number(m[8]),
    fade: Number(m[9]) / 100,
  }));
};

/** The mare colour shared by all seven layers, as "r,g,b". */
const webMareColor = (scss: string): string => {
  const face = scss.slice(scss.indexOf("  .moon-face {"));
  const m = face.match(/rgba\(\s*(\d+),\s*(\d+),\s*(\d+),\s*[\d.]+\s*\)/);
  return `${m![1]},${m![2]},${m![3]}`;
};

type AndroidMare = Mare & { color: string; pivotX: number; pivotY: number };

/** Each `<group>`-wrapped mare of the night vector, in document order. */
const androidMaria = (xml: string): AndroidMare[] => {
  const re =
    /<group android:pivotX="([\d.]+)" android:pivotY="([\d.]+)" android:scaleX="([\d.]+)">[\s\S]*?android:centerX="([\d.]+)"[\s\S]*?android:centerY="([\d.]+)"[\s\S]*?android:gradientRadius="([\d.]+)"[\s\S]*?android:offset="0.0" android:color="#([0-9A-F]{2})([0-9A-F]{6})"[\s\S]*?android:offset="([\d.]+)"/g;
  return [...xml.matchAll(re)].map((m) => {
    const ry = Number(m[6]);
    const scaleX = Number(m[3]);
    return {
      pivotX: Number(m[1]),
      pivotY: Number(m[2]),
      cx: Number(m[4]),
      cy: Number(m[5]),
      ry,
      rx: ry * scaleX,
      alpha: parseInt(m[7], 16) / 255,
      fade: Number(m[9]),
      color: [0, 2, 4].map((i) => parseInt(m[8].slice(i, i + 2), 16)).join(","),
    };
  });
};

/** The `maria` array in CompanionSun.swift. */
const iosMaria = (swift: string): Mare[] => {
  const re =
    /Mare\(cx: ([\d.]+), cy: ([\d.]+), rx: ([\d.]+), ry: ([\d.]+), alpha: ([\d.]+), fade: ([\d.]+)\)/g;
  return [...swift.matchAll(re)].map((m) => ({
    cx: Number(m[1]),
    cy: Number(m[2]),
    rx: Number(m[3]),
    ry: Number(m[4]),
    alpha: Number(m[5]),
    fade: Number(m[6]),
  }));
};

const web = webMaria(read(WEB));
const android = androidMaria(read(ANDROID));
const ios = iosMaria(read(IOS));

describe("the moon's face is one moon on all three platforms", () => {
  it("finds all seven maria in each source", () => {
    // Guards the parsers themselves: a regex that silently matched nothing would
    // make every comparison below vacuously pass.
    expect(web).toHaveLength(7);
    expect(android).toHaveLength(7);
    expect(ios).toHaveLength(7);
  });

  it("keeps the maria asymmetric, which is what stops them reading as a face", () => {
    // The failure this guards is specific and was hit once already: a tidy layout
    // (a symmetric pair up top, one centred below) stops being a moon at the
    // companion's ~42px and becomes a smiley face. Asymmetry is load-bearing, so
    // no two maria may mirror each other about the vertical axis.
    for (const a of web) {
      for (const b of web) {
        if (a === b) continue;
        const mirrored =
          Math.abs(1 - a.cx - b.cx) < 0.02 && Math.abs(a.cy - b.cy) < 0.02;
        expect(mirrored).toBe(false);
      }
    }
  });

  it("keeps every mare above the contrast floor", () => {
    // Fainter than this and the disc stops reading as a moon at all - it just
    // looks like a smudged pearl. Found by building it too faint first.
    for (const m of web) expect(m.alpha).toBeGreaterThanOrEqual(0.18);
  });

  it.each([0, 1, 2, 3, 4, 5, 6])(
    "mare %i matches the web in the Android vector",
    (i) => {
      const w = web[i];
      const a = android[i];
      expect(a.cx).toBeCloseTo(DISC_ORIGIN + w.cx * DISC_DIAMETER, 2);
      expect(a.cy).toBeCloseTo(DISC_ORIGIN + w.cy * DISC_DIAMETER, 2);
      expect(a.rx).toBeCloseTo(w.rx * DISC_DIAMETER, 2);
      expect(a.ry).toBeCloseTo(w.ry * DISC_DIAMETER, 2);
      expect(a.alpha).toBeCloseTo(w.alpha, 2);
      expect(a.fade).toBeCloseTo(w.fade, 4);
      // The squash must pivot on the mare's own centre, or scaling moves it.
      expect(a.pivotX).toBe(a.cx);
      expect(a.pivotY).toBe(a.cy);
    },
  );

  it.each([0, 1, 2, 3, 4, 5, 6])("mare %i matches the web on iOS", (i) => {
    // iOS keeps the CSS fractions verbatim, so this is equality, not a mapping.
    expect(ios[i]).toEqual(web[i]);
  });

  it("uses one mare colour everywhere", () => {
    const color = webMareColor(read(WEB));
    expect(color).toBe("168,180,203");
    for (const a of android) expect(a.color).toBe(color);
    expect(read(IOS)).toContain("rgb(168, 180, 203)");
  });

  it("draws the body from the same centre and radius", () => {
    const scss = read(WEB);
    const face = scss.slice(scss.indexOf("  .moon-face {"));
    const body = face.match(/circle at ([\d.]+)% ([\d.]+)%/)!;
    const cx = Number(body[1]) / 100;
    const cy = Number(body[2]) / 100;

    const xml = read(ANDROID);
    expect(Number(xml.match(/android:centerX="45.36"/) && 45.36)).toBeCloseTo(
      DISC_ORIGIN + cx * DISC_DIAMETER,
      2,
    );
    expect(Number(xml.match(/android:centerY="41.04"/) && 41.04)).toBeCloseTo(
      DISC_ORIGIN + cy * DISC_DIAMETER,
      2,
    );

    // CSS `circle` with no size is farthest-corner: from (cx, cy) in a unit box,
    // the far corner is the one diagonally opposite. Android states it absolutely,
    // iOS as a fraction of the diameter.
    const farthest = Math.hypot(Math.max(cx, 1 - cx), Math.max(cy, 1 - cy));
    expect(66.26).toBeCloseTo(farthest * DISC_DIAMETER, 1);
    expect(read(IOS)).toContain("diameter * 0.92");
    expect(0.92).toBeCloseTo(farthest, 2);
  });
});
