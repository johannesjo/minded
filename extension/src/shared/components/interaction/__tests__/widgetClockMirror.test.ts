import { readFileSync } from "fs";
import { resolve } from "path";
import {
  AMBIENT_SKY_KEYFRAMES,
  NIGHT_END_HOUR,
  NIGHT_START_HOUR,
} from "@src/shared/skyTimeline";

/**
 * Both native widgets re-implement the app's day/night clock — Android in Kotlin
 * (SunWidgetPhase.kt), iOS in Swift (SunWidgetPhase.swift) — because they repaint
 * on the OS's schedule while the app (and its WebView, where skyTimeline runs) is
 * closed, so they can't read a value the JS wrote. Those native copies must not
 * drift from skyTimeline's boundary, or the home-screen sun shows a different
 * time of day than the app (a sun at 20:00 while the app is already night with
 * the moon). This asserts all of them agree. The upgrade path, if the copies
 * multiply further, is a generated shared constant instead of this mirror.
 *
 * Sibling to widgetPromptsMirror.test.ts, which guards the prompt pool the same
 * way. jest runs with cwd = extension/, so android/ is one up and ios/ is here.
 */

const ANDROID_PHASE =
  "../android/app/src/main/java/com/minded/minded/widget/SunWidgetPhase.kt";
const ANDROID_SKY =
  "../android/app/src/main/java/com/minded/minded/widget/WidgetSky.kt";
const IOS_PHASE = "ios/App/MindedWidget/SunWidgetPhase.swift";

const read = (relPath: string): string =>
  readFileSync(resolve(process.cwd(), relPath), "utf8");

/** The single integer assigned to `<name>` in a Kotlin/Swift source. */
const nativeInt = (source: string, name: string): number => {
  const match = source.match(new RegExp(`${name}\\s*=\\s*(-?\\d+)`));
  if (!match) throw new Error(`could not find ${name} in native source`);
  return Number(match[1]);
};

describe("the widget clock mirrors skyTimeline (native copies ↔ TS)", () => {
  it("Android SunWidgetPhase matches the app's day/night boundary", () => {
    const phase = read(ANDROID_PHASE);
    expect(nativeInt(phase, "DAY_START")).toBe(NIGHT_END_HOUR);
    expect(nativeInt(phase, "NIGHT_START")).toBe(NIGHT_START_HOUR);
  });

  it("iOS SunWidgetPhase matches the app's day/night boundary", () => {
    const phase = read(IOS_PHASE);
    expect(nativeInt(phase, "dayStart")).toBe(NIGHT_END_HOUR);
    expect(nativeInt(phase, "nightStart")).toBe(NIGHT_START_HOUR);
  });

  // Guards that the widget gains a sky whenever the app gains a keyframe (a new
  // time-of-day). It only checks the face *names* exist, not the whole-hour
  // bucket edges (9/13/17/18) — those are an intentional widget-side
  // quantization of the app's per-minute interpolation, not a mirror.
  it("every ambient keyframe has a matching WidgetSky face (Android)", () => {
    const faces = read(ANDROID_SKY)
      .match(/enum class WidgetSky\s*\{\s*([^;]+);/)?.[1]
      ?.split(",")
      .map((s) => s.trim().toUpperCase());
    expect(faces).toBeDefined();
    for (const kf of AMBIENT_SKY_KEYFRAMES) {
      expect(faces).toContain(kf.label.toUpperCase());
    }
  });
});
