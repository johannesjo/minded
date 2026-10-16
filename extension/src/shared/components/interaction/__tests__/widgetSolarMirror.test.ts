import { readdirSync, readFileSync } from "fs";
import { resolve } from "path";
import { AMBIENT_SKY_KEYFRAMES } from "@src/shared/skyTimeline";
import { NIGHT_ELEVATION, skyMomentAt } from "@src/shared/sky/solarSky";
import { TIME_ZONE_COORDINATES_PACKED } from "@src/shared/sky/timeZoneCoordinates";
import { locationForTimeZone } from "@src/shared/sky/timeZoneLocation";
import { moonPhaseAt, SYNODIC_MONTH_DAYS } from "@src/shared/sky/lunarPhase";

/**
 * Both home-screen widgets time their sun to the real sky - the same dusk and
 * dawn as the app (solarSky.ts) - through native ports: WidgetSun.kt and
 * WidgetSun.swift, each with a generated copy of the time zone table. They
 * repaint while the app's WebView isn't running, so they can't read the JS;
 * this keeps the ports from drifting from it:
 *
 * - the generated tables are verbatim copies of the TS one,
 * - the night elevation and keyframe hours match the TS constants,
 * - every fixture in the JVM WidgetSunTest is what the TS computes for that
 *   instant, so the Kotlin port is checked against the app on each jest run
 *   (the JVM test then checks Kotlin against those same rows),
 * - every Swift source and resource is actually wired into the widget target
 *   (it's added programmatically on CI; a file left out fails the archive).
 *
 * Sibling to widgetClockMirror.test.ts (the fixed-clock fallback) and
 * widgetPromptsMirror.test.ts. jest runs with cwd = extension/.
 */

const ANDROID_WIDGET = "../android/app/src/main/java/com/minded/minded/widget";
const ANDROID_TEST = "../android/app/src/test/java/com/minded/minded/widget";
const IOS_WIDGET = "ios/App/MindedWidget";

const read = (relPath: string): string =>
  readFileSync(resolve(process.cwd(), relPath), "utf8");

/** The single JSON-style string literal assigned to `<name>`. */
const packedIn = (source: string, name: string): string => {
  const match = source.match(
    new RegExp(`${name}\\s*=\\s*("(?:[^"\\\\]|\\\\.)*")`),
  );
  if (!match) throw new Error(`could not find ${name}`);
  return JSON.parse(match[1]);
};

/** The number assigned to `<name>` in a Kotlin/Swift source. */
const nativeNumber = (source: string, name: string): number => {
  const match = source.match(
    new RegExp(`${name}\\s*=\\s*(-?\\d+(?:\\.\\d+)?)`),
  );
  if (!match) throw new Error(`could not find ${name}`);
  return Number(match[1]);
};

const keyframeHour = (label: string): number => {
  const kf = AMBIENT_SKY_KEYFRAMES.find((k) => k.label === label);
  if (!kf) throw new Error(`no keyframe ${label}`);
  return kf.hour;
};

describe("the widgets' true sky mirrors solarSky (native ports ↔ TS)", () => {
  it("the generated time zone tables are verbatim copies", () => {
    expect(
      packedIn(read(`${ANDROID_WIDGET}/WidgetTimeZones.kt`), "PACKED"),
    ).toBe(TIME_ZONE_COORDINATES_PACKED);
    expect(
      packedIn(read(`${IOS_WIDGET}/WidgetTimeZones.swift`), "packed"),
    ).toBe(TIME_ZONE_COORDINATES_PACKED);
  });

  it.each([
    [
      "Kotlin",
      `${ANDROID_WIDGET}/WidgetSun.kt`,
      "NIGHT_ELEVATION",
      [
        "DAWN_HOUR",
        "MORNING_HOUR",
        "MIDDAY_HOUR",
        "AFTERNOON_HOUR",
        "DUSK_HOUR",
      ],
    ],
    [
      "Swift",
      `${IOS_WIDGET}/WidgetSun.swift`,
      "nightElevation",
      ["dawnHour", "morningHour", "middayHour", "afternoonHour", "duskHour"],
    ],
  ])(
    "%s: the night boundary and keyframe hours match",
    (_, path, nightName, hourNames) => {
      const source = read(path);
      expect(nativeNumber(source, nightName)).toBe(NIGHT_ELEVATION);
      const labels = ["dawn", "morning", "midday", "afternoon", "dusk"];
      labels.forEach((label, i) => {
        expect(nativeNumber(source, hourNames[i])).toBe(keyframeHour(label));
      });
    },
  );

  it("every JVM fixture is what the app's own sky computes", () => {
    const source = read(`${ANDROID_TEST}/WidgetSunTest.kt`);
    const rows = [
      ...source.matchAll(
        /Fixture\("([^"]+)", (\d+)L, (true|false), (-?\d+\.\d+)\)/g,
      ),
    ];
    expect(rows.length).toBeGreaterThanOrEqual(5);
    for (const [, zone, ms, isNight, skyHour] of rows) {
      const location = locationForTimeZone(zone);
      expect(location).not.toBeNull();
      const moment = skyMomentAt(new Date(Number(ms)), location);
      expect({ zone, ms, isNight: moment.isNight }).toEqual({
        zone,
        ms,
        isNight: isNight === "true",
      });
      expect(moment.hour).toBeCloseTo(Number(skyHour), 3);
    }
  });

  it("the widgets' moon phase mirrors the app's (lunarPhase + moonShadow)", () => {
    const shadowTs = read("src/shared/sky/moonShadow.ts");
    const tsConst = (name: string): string => {
      const match = shadowTs.match(new RegExp(`const ${name} = ([^;]+);`));
      if (!match) throw new Error(`no ${name} in moonShadow.ts`);
      return match[1].trim();
    };
    const kotlin = read(`${ANDROID_WIDGET}/WidgetMoon.kt`);
    const swift = read(`${IOS_WIDGET}/WidgetMoon.swift`);
    expect(nativeNumber(kotlin, "SYNODIC_MONTH_DAYS")).toBe(SYNODIC_MONTH_DAYS);
    expect(nativeNumber(swift, "synodicMonthDays")).toBe(SYNODIC_MONTH_DAYS);
    const opacity = Number(tsConst("EARTHSHINE_OPACITY"));
    expect(nativeNumber(kotlin, "EARTHSHINE_OPACITY")).toBe(opacity);
    expect(nativeNumber(swift, "earthshineOpacity")).toBe(opacity);
    const margin = Number(tsConst("LIMB_MARGIN"));
    expect(nativeNumber(kotlin, "LIMB_MARGIN")).toBe(margin);
    expect(nativeNumber(swift, "limbMargin")).toBe(margin);
    const full = Number(tsConst("FULL_MOON_ILLUMINATION"));
    expect(nativeNumber(kotlin, "FULL_MOON_ILLUMINATION")).toBe(full);
    expect(nativeNumber(swift, "fullMoonIllumination")).toBe(full);
    // The earthshine colour (#141e3d, URL-escaped in the TS) and the blur σ.
    expect(tsConst("EARTHSHINE_FILL")).toBe('"%23141e3d"');
    expect(kotlin).toContain("EARTHSHINE_RGB = 0x141E3D");
    expect(swift).toContain("(r: 0x14, g: 0x1E, b: 0x3D)");
    expect(shadowTs).toContain("stdDeviation='3'");
    expect(nativeNumber(kotlin, "BLUR_STD_DEVIATION")).toBe(3);
    expect(nativeNumber(swift, "blurStdDeviation: CGFloat")).toBe(3);

    const rows = [
      ...read(`${ANDROID_TEST}/WidgetMoonTest.kt`).matchAll(
        /MoonFixture\((\d+)L, (\d+\.\d+), (\d+\.\d+), (true|false)\)/g,
      ),
    ];
    expect(rows.length).toBeGreaterThanOrEqual(3);
    for (const [, ms, cycle, illumination, isWaxing] of rows) {
      const phase = moonPhaseAt(new Date(Number(ms)));
      expect(phase.cycle).toBeCloseTo(Number(cycle), 5);
      expect(phase.illumination).toBeCloseTo(Number(illumination), 5);
      expect(phase.isWaxing).toBe(isWaxing === "true");
    }
  });

  it("every widget Swift source and resource is wired into the iOS target", () => {
    const script = read("ios/App/scripts/add_widget_target.rb");
    const listed = (constName: string): string[] => {
      const match = script.match(
        new RegExp(`${constName} = %w\\[([^\\]]*)\\]`),
      );
      if (!match) throw new Error(`no ${constName} in add_widget_target.rb`);
      return match[1].split(/\s+/).filter(Boolean);
    };
    const swift = readdirSync(resolve(process.cwd(), IOS_WIDGET)).filter((f) =>
      f.endsWith(".swift"),
    );
    expect(listed("SOURCE_FILES").sort()).toEqual(swift.sort());
    const fonts = readdirSync(resolve(process.cwd(), IOS_WIDGET)).filter((f) =>
      f.endsWith(".ttf"),
    );
    const resources = listed("RESOURCE_FILES");
    const plist = read(`${IOS_WIDGET}/Info.plist`);
    for (const font of fonts) {
      expect(resources).toContain(font);
      expect(plist).toContain(`<string>${font}</string>`);
    }
  });
});
