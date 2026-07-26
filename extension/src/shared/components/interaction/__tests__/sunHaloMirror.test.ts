import { readFileSync } from "fs";
import { resolve } from "path";

/**
 * THE HALO RULE, enforced across the language boundary.
 *
 * The rule (see sunSettle.ts) says the sun's halo is white on every surface we
 * control and amber only where it stands on a background we don't. On the web
 * side that is structural - `settle.warmth` is the sole positive input to the
 * glow axis, and sunSettle.test.ts guards it. On the native side it is four
 * hand-written gradient stops in an Android vector drawable, duplicated by hand
 * again in a SwiftUI gradient, with the whole rule living in prose comments that
 * say "keep the two files in step". Nothing enforced that. This does.
 *
 * Three separate things can drift, and each has cost the app a bug before:
 *   1. the two Android drawables diverging in something other than the bloom;
 *   2. the iOS gradient drifting from the Android vector it was ported from;
 *   3. a call site passing the wrong `onOwnSky`, putting an amber sun on our own
 *      sky (or a white one on the user's wallpaper, where it reads as a blob).
 *
 * Sibling to widgetClockMirror.test.ts / widgetPromptsMirror.test.ts, which
 * guard the widget's clock and prompt pool the same way. jest runs with
 * cwd = extension/, so android/ is one up and ios/ is here.
 */

const ANDROID_SUN_WALLPAPER =
  "../android/app/src/main/res/drawable/ic_sun_widget_day.xml";
const ANDROID_SUN_ON_SKY =
  "../android/app/src/main/res/drawable/ic_sun_widget_day_on_sky.xml";
const ANDROID_WIDGET =
  "../android/app/src/main/java/com/minded/minded/widget/MyAppWidget.kt";
const IOS_SUN = "ios/App/MindedWidget/CompanionSun.swift";
const IOS_WIDGET = "ios/App/MindedWidget/MindedWidget.swift";
const ANDROID_LITTLE_SUN =
  "../android/app/src/main/java/com/minded/minded/ui/compose/LittleSun.kt";
const ANDROID_INTERACTION_WINDOW =
  "../android/app/src/main/java/com/minded/minded/overlay/InteractionWindow.kt";

const read = (relPath: string): string =>
  readFileSync(resolve(process.cwd(), relPath), "utf8");

type Stop = { offset: number; r: number; g: number; b: number; alpha: number };

/** Gradient stops of an Android vector, in document order (bloom then disc). */
const androidStops = (xml: string): Stop[] => {
  const stops: Stop[] = [];
  const re =
    /<item\s+android:offset="([\d.]+)"\s+android:color="#([0-9A-Fa-f]{8})"\s*\/>/g;
  for (const m of xml.matchAll(re)) {
    const hex = m[2];
    stops.push({
      offset: Number(m[1]),
      // Android hex is #AARRGGBB.
      alpha: parseInt(hex.slice(0, 2), 16) / 255,
      r: parseInt(hex.slice(2, 4), 16),
      g: parseInt(hex.slice(4, 6), 16),
      b: parseInt(hex.slice(6, 8), 16),
    });
  }
  return stops;
};

/** The two branches of CompanionSun.glow's `onOwnSky ? [...] : [...]` ternary. */
const swiftGlowBranches = (
  swift: string,
): { onSky: Stop[]; wallpaper: Stop[] } => {
  const ternary = swift.match(
    /=\s*onOwnSky\s*\?\s*\[([\s\S]*?)\]\s*:\s*\[([\s\S]*?)\]/,
  );
  if (!ternary) throw new Error("could not find the onOwnSky glow ternary");

  const parse = (branch: string): Stop[] => {
    const stops: Stop[] = [];
    const re =
      /rgb\(\s*(\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\s*\)[\s\S]*?location:\s*([\d.]+)/g;
    for (const m of branch.matchAll(re)) {
      stops.push({
        r: Number(m[1]),
        g: Number(m[2]),
        b: Number(m[3]),
        alpha: m[4] === undefined ? 1 : Number(m[4]),
        offset: Number(m[5]),
      });
    }
    return stops;
  };

  return { onSky: parse(ternary[1]), wallpaper: parse(ternary[2]) };
};

/** Source lines with XML comments and blank lines removed. */
const significantXmlLines = (xml: string): string[] =>
  xml
    .replace(/<!--[\s\S]*?-->/g, "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

/** Kotlin/Swift source with `//` comment lines removed. */
const withoutLineComments = (source: string): string =>
  source
    .split("\n")
    .filter((line) => !line.trim().startsWith("//"))
    .join("\n");

/** Body of a Kotlin/Swift declaration, sliced between two source markers. */
const sliceBetween = (source: string, start: string, end: string): string => {
  const from = source.indexOf(start);
  const to = source.indexOf(end, from + start.length);
  if (from < 0 || to < 0) {
    throw new Error(`could not slice between "${start}" and "${end}"`);
  }
  return source.slice(from, to);
};

const WHITE = { r: 255, g: 255, b: 255 };
/** The bloom's peak alpha, shared by both twins and both platforms. */
const PEAK_ALPHA = 0.28;

describe("the widget sun's halo mirrors the rule (Android ↔ iOS)", () => {
  const wallpaperXml = read(ANDROID_SUN_WALLPAPER);
  const onSkyXml = read(ANDROID_SUN_ON_SKY);

  it("keeps the two Android drawables identical apart from the bloom's colours", () => {
    const a = significantXmlLines(wallpaperXml);
    const b = significantXmlLines(onSkyXml);
    expect(b).toHaveLength(a.length);

    const differing = a
      .map((line, i) => ({ line, other: b[i] }))
      .filter(({ line, other }) => line !== other);

    // Exactly the four bloom stops may differ - nothing else. If the disc, the
    // paths, the viewport or the gradient geometry drift apart, this fails.
    expect(differing).toHaveLength(4);
    for (const { line, other } of differing) {
      expect(line).toMatch(/^<item android:offset=/);
      expect(other).toMatch(/^<item android:offset=/);
      // Same offset on both sides: only the colour is allowed to change.
      expect(other.match(/offset="([\d.]+)"/)![1]).toBe(
        line.match(/offset="([\d.]+)"/)![1],
      );
    }
  });

  it("glows white on the app's own sky", () => {
    const bloom = androidStops(onSkyXml).slice(0, 4);
    expect(bloom).toHaveLength(4);
    for (const stop of bloom) {
      expect({ r: stop.r, g: stop.g, b: stop.b }).toEqual(WHITE);
    }
    // Transparent at the centre and the rim, peaking in between.
    expect(bloom.map((s) => Number(s.alpha.toFixed(2)))).toEqual([
      0,
      0,
      PEAK_ALPHA,
      0,
    ]);
  });

  it("keeps the amber bloom for the sun on the user's wallpaper", () => {
    const bloom = androidStops(wallpaperXml).slice(0, 4);
    // Not white - this is the whole point of the twin. The peak stop is the one
    // canonical amber shared with the Little Sun (#ffd673 == 255,214,115).
    expect({ r: bloom[2].r, g: bloom[2].g, b: bloom[2].b }).toEqual({
      r: 255,
      g: 214,
      b: 115,
    });
    expect(Number(bloom[2].alpha.toFixed(2))).toBe(PEAK_ALPHA);
  });

  it("keeps the disc identical on both twins - the body may be warm", () => {
    // The faint gold rim is the sun's *body*, not the light it casts, so it is
    // the same on our sky and on the wallpaper (and matches the in-app
    // companion's --minded-sun-face-edge).
    const disc = (xml: string) => androidStops(xml).slice(4);
    expect(disc(onSkyXml)).toEqual(disc(wallpaperXml));
    const rim = disc(onSkyXml).at(-1)!;
    expect({ r: rim.r, g: rim.g, b: rim.b }).toEqual({
      r: 0xff,
      g: 0xf5,
      b: 0xdc,
    });
  });

  it("ports both blooms to iOS stop for stop", () => {
    const { onSky, wallpaper } = swiftGlowBranches(read(IOS_SUN));
    const android = {
      onSky: androidStops(onSkyXml).slice(0, 4),
      wallpaper: androidStops(wallpaperXml).slice(0, 4),
    };

    for (const key of ["onSky", "wallpaper"] as const) {
      const swift = key === "onSky" ? onSky : wallpaper;
      expect(swift).toHaveLength(4);
      swift.forEach((stop, i) => {
        const twin = android[key][i];
        expect({ r: stop.r, g: stop.g, b: stop.b }).toEqual({
          r: twin.r,
          g: twin.g,
          b: twin.b,
        });
        expect(stop.offset).toBeCloseTo(twin.offset, 2);
        // Android carries alpha as a hex byte (0x47), Swift as a decimal (0.28);
        // they must land on the same opacity.
        expect(stop.alpha).toBeCloseTo(twin.alpha, 2);
      });
    }
  });

  it("passes onOwnSky by what the sun stands on, on both platforms", () => {
    // Android: the card paints the app's sky, the bare sun sits on the wallpaper.
    const kotlin = read(ANDROID_WIDGET);
    const androidBare = sliceBetween(
      kotlin,
      "private fun SunOnly(",
      "private fun PromptCard(",
    );
    const androidCard = sliceBetween(
      kotlin,
      "private fun PromptCard(",
      "private fun skyFor(",
    );
    expect(androidCard).toMatch(/drawableFor\(phase,\s*onOwnSky\s*=\s*true\)/);
    expect(androidBare).not.toMatch(/onOwnSky/);

    // iOS: same split, between the systemMedium card and the systemSmall sun.
    const swift = read(IOS_WIDGET);
    const iosBare = sliceBetween(
      swift,
      "private struct SunOnly:",
      "private struct PromptCard:",
    );
    const iosCard = swift.slice(swift.indexOf("private struct PromptCard:"));
    expect(iosCard).toMatch(/CompanionSun\([^)]*onOwnSky:\s*true/);
    expect(iosBare).not.toMatch(/onOwnSky/);
  });
});

/**
 * The widget is not the only native sun that stands on a sky we paint. When an
 * intervention fires fresh on Android, the WebView needs a beat to boot, so the
 * overlay greets the user with a NATIVE disc (`FreshArrivalSun`) over its own
 * loading sky, then cross-fades it into the web sun. On our own surface, handing
 * off to a white-haloed web sun - so it glows white. It wore the Little Sun's
 * amber until #262, which opened every fresh intervention on an orange halo that
 * turned white at the hand-off.
 *
 * Both of this file's discs are *arriving*, and arriving is white: the corner
 * placeholder waits on the same loading sky for the web sun that now mounts white
 * too (`sunArriveSettleAt`), and the fresh disc waits there for its own.
 *
 * But `onOwnSky` is a *state*, not a property of a call site. Tapping the fresh
 * disc turns it into the escape hatch: it morphs into the Little Sun over someone
 * else's app, and warms back to amber across that glide. So one call site holds
 * both answers over its life. The warming is always a hand-off *outward* - never
 * a state a sun on our sky holds, and never a cut.
 */
describe("the overlay's native suns follow the rule too", () => {
  const littleSun = read(ANDROID_LITTLE_SUN);
  const interactionWindow = read(ANDROID_INTERACTION_WINDOW);

  /**
   * Every `SunDisc(...)` invocation in a source file, argument list included.
   * Scanning for calls (rather than slicing the file between two declarations)
   * keeps the guard indifferent to how the file is ordered, and to prose that
   * merely mentions an argument name.
   */
  const sunDiscCalls = (kotlin: string): string[] => {
    const calls: string[] = [];
    const source = withoutLineComments(kotlin);
    for (const match of source.matchAll(/\bSunDisc\(/g)) {
      let depth = 0;
      for (let i = match.index! + match[0].length - 1; i < source.length; i++) {
        if (source[i] === "(") depth++;
        else if (source[i] === ")" && --depth === 0) {
          calls.push(source.slice(match.index!, i + 1));
          break;
        }
      }
    }
    return calls;
  };

  it("glows white on our own sky, amber on someone else's", () => {
    // The amber is the one canonical #ffd673, shared with every other Little Sun.
    expect(littleSun).toMatch(/GLOW_COLOR\s*=\s*Color\(0xFFFFD673\)/);
    expect(littleSun).toMatch(/GLOW_COLOR_OWN_SKY\s*=\s*Color\.White/);
    // One `when`, three arms: night wins over everything (the moon never warms),
    // then our own sky, then the wallpaper/foreign-app default.
    expect(
      sliceBetween(littleSun, "val targetGlowColor = when {", "val glowColor"),
    ).toMatch(
      /night\s*->\s*GLOW_COLOR_NIGHT[\s\S]*onOwnSky\s*->\s*GLOW_COLOR_OWN_SKY[\s\S]*else\s*->\s*GLOW_COLOR/,
    );
  });

  it("eases between halo colours instead of cutting", () => {
    // A sun that changes which sky it stands on must *warm* into the new colour.
    // Every transition is soft (see the styling rules); a swap mid-morph is the
    // jolt the whole hand-off machinery exists to avoid.
    expect(
      sliceBetween(littleSun, "val glowColor by", "val bodyColor"),
    ).toMatch(
      /animateColorAsState\([\s\S]*targetValue\s*=\s*targetGlowColor[\s\S]*tween\(\s*durationMillis\s*=\s*glowMorphMs/,
    );
  });

  it("keeps both arriving discs white, and lets only the escape warm", () => {
    const [cornerHandoff, freshArrival] = sunDiscCalls(interactionWindow);
    expect(sunDiscCalls(interactionWindow)).toHaveLength(2);

    // The corner placeholder waits on our loading sky for a web sun that now
    // arrives white too (sunArriveSettleAt) - so it is white, not the amber it
    // wore while it was still the Little Sun over the blocked app.
    expect(cornerHandoff.replace(/\s/g, "")).toBe("SunDisc(onOwnSky=true)");

    // The fresh disc tracks which sky is under it: white while it waits on ours,
    // warming back to amber once tapping it turns the disc into the Little Sun.
    // A literal `true` here is the #262 regression - it pinned the escape morph
    // white all the way into an amber Little Sun.
    expect(freshArrival).toMatch(
      /onOwnSky\s*=\s*escapeStep\s*==\s*FreshArrivalEscapeStep\.NONE/,
    );
    expect(freshArrival).not.toMatch(/onOwnSky\s*=\s*true/);
    // ...and it warms over exactly the glide that carries it there, so the colour
    // lands with the position.
    expect(freshArrival).toMatch(/glowMorphMs\s*=\s*FRESH_SUN_MORPH_MS/);
  });
});
