import { readFileSync } from "fs";
import { resolve } from "path";
import {
  LATER_PAUSE_AFTER_S,
  SKIP_CHECK_IN_THRESHOLD,
  SKIP_STREAK_MAX_GAP_MS,
} from "@src/shared/components/interaction/skipCheckIn/skipCheckIn";

/**
 * The skip check-in is decided in the WebView (skipCheckIn.ts), but Android
 * honours it natively - the loading sun's shortcut must know when the check-in
 * is due, and the Little Sun must know when a "later" week hands back to the
 * pause. Those native copies (util/InterventionPause.kt) must not drift from
 * the TS module, or the two halves of one choice would disagree. Sibling to
 * widgetClockMirror.test.ts; jest runs with cwd = extension/.
 */

const ANDROID_PAUSE =
  "../android/app/src/main/java/com/minded/minded/util/InterventionPause.kt";

const nativeInt = (source: string, name: string): number => {
  const match = source.match(new RegExp(`${name}\\s*=\\s*(-?\\d+)`));
  if (!match) throw new Error(`could not find ${name} in native source`);
  return Number(match[1]);
};

describe("the skip check-in mirrors skipCheckIn.ts (Kotlin ↔ TS)", () => {
  const source = readFileSync(resolve(process.cwd(), ANDROID_PAUSE), "utf8");

  it("asks after the same number of passes", () => {
    expect(nativeInt(source, "SKIP_CHECK_IN_THRESHOLD")).toBe(
      SKIP_CHECK_IN_THRESHOLD,
    );
  });

  it("bounds 'lately' by the same gap between passes", () => {
    expect(nativeInt(source, "SKIP_STREAK_MAX_GAP_MS")).toBe(
      SKIP_STREAK_MAX_GAP_MS,
    );
  });

  it("holds a 'later' week's pause back for the same time", () => {
    expect(nativeInt(source, "LATER_PAUSE_AFTER_S")).toBe(LATER_PAUSE_AFTER_S);
  });

  it("names the two weeks the same way", () => {
    expect(source).toMatch(/INTERVENTION_PAUSE_KIND_LATER = "later"/);
    expect(source).toMatch(/INTERVENTION_PAUSE_KIND_OFF = "off"/);
  });
});
