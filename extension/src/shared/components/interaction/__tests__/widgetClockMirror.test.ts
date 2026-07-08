import { readFileSync } from "fs";
import { resolve } from "path";
import {
  AMBIENT_SKY_KEYFRAMES,
  NIGHT_END_HOUR,
  NIGHT_START_HOUR,
} from "@src/shared/skyTimeline";

/**
 * The Android widget re-implements the app's day/night clock in Kotlin because
 * it repaints on alarms while the app (and its WebView) is closed — it can't
 * read a value the JS wrote. That native copy must not drift from skyTimeline's
 * boundary, or the home-screen sun shows a different time of day than the app:
 * its dusk sky (and sun) while the app is already night with the moon. This
 * asserts the two agree. If a third consumer ever appears (e.g. the iOS widget),
 * the upgrade path is a generated shared constant instead of this mirror.
 *
 * Sibling to widgetPromptsMirror.test.ts, which guards the prompt pool the same
 * way. jest runs with cwd = extension/, so the android/ tree is one up.
 */
const widgetDir = resolve(
  process.cwd(),
  "../android/app/src/main/java/com/minded/minded/widget",
);
const readKt = (name: string): string =>
  readFileSync(resolve(widgetDir, name), "utf8");

/** The single integer assigned to `<name>` in the Kotlin source. */
const ktInt = (source: string, name: string): number => {
  const match = source.match(new RegExp(`${name}\\s*=\\s*(-?\\d+)`));
  if (!match) throw new Error(`could not find ${name} in Kotlin source`);
  return Number(match[1]);
};

describe("the widget clock mirrors skyTimeline (Kotlin ↔ TS)", () => {
  const phase = readKt("SunWidgetPhase.kt");

  it("day/night boundary equals the app's (so sun/moon flip together)", () => {
    expect(ktInt(phase, "DAY_START")).toBe(NIGHT_END_HOUR);
    expect(ktInt(phase, "NIGHT_START")).toBe(NIGHT_START_HOUR);
  });

  it("every ambient keyframe has a matching WidgetSky face", () => {
    const faces = readKt("WidgetSky.kt")
      .match(/enum class WidgetSky\s*\{\s*([^;]+);/)?.[1]
      ?.split(",")
      .map((s) => s.trim().toUpperCase());
    expect(faces).toBeDefined();
    for (const kf of AMBIENT_SKY_KEYFRAMES) {
      expect(faces).toContain(kf.label.toUpperCase());
    }
  });
});
