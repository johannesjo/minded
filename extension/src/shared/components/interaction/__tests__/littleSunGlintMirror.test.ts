import { readFileSync } from "fs";
import { resolve } from "path";
import {
  LITTLE_SUN_GLINT_DEFAULT_MINUTES,
  LITTLE_SUN_GLINT_MINUTES_OPTIONS,
  LITTLE_SUN_GLINT_QUIET_BEFORE_PAUSE_S,
} from "@src/shared/components/interaction/littleSunGlint";

/**
 * The glint interval is chosen in the WebView settings but read natively too
 * (LittleSunGlint.kt). The default, the offered intervals and the quiet window
 * must match, or the two Little Suns would glint on different clocks.
 * Sibling to mindfulnessBellMirror.test.ts; jest runs with cwd = extension/.
 */
const KOTLIN =
  "../android/app/src/main/java/com/minded/minded/util/LittleSunGlint.kt";

describe("the glint mirrors LittleSunGlint.kt (Kotlin ↔ TS)", () => {
  const source = readFileSync(resolve(process.cwd(), KOTLIN), "utf8");

  it("defaults to the same interval", () => {
    expect(source).toMatch(
      new RegExp(
        `LITTLE_SUN_GLINT_DEFAULT_MINUTES = ${LITTLE_SUN_GLINT_DEFAULT_MINUTES}\\b`,
      ),
    );
  });

  it("accepts exactly the intervals the setting offers, plus off", () => {
    const allowed = [0, ...LITTLE_SUN_GLINT_MINUTES_OPTIONS].join(", ");
    expect(source).toContain(
      `LITTLE_SUN_GLINT_MINUTES_ALLOWED = setOf(${allowed})`,
    );
  });

  it("keeps the same quiet window before a pause", () => {
    expect(source).toMatch(
      new RegExp(
        `LITTLE_SUN_GLINT_QUIET_BEFORE_PAUSE_S = ${LITTLE_SUN_GLINT_QUIET_BEFORE_PAUSE_S / 60} \\* 60\\b`,
      ),
    );
  });
});
