import { readFileSync } from "fs";
import { resolve } from "path";
import {
  BELL_PER_DAY_MAX,
  BELL_PER_DAY_MIN,
  DEFAULT_BELL_PER_DAY,
} from "@src/shared/components/settings/mindfulnessBell.const";

/**
 * The bell's count is chosen in the WebView settings but drawn natively
 * (MindfulnessBellSchedule.kt). The default the setting shows must be the one
 * the schedule uses, and the choices must be the range it accepts. Sibling to
 * interventionPauseMirror.test.ts; jest runs with cwd = extension/.
 */
const SCHEDULE =
  "../android/app/src/main/java/com/minded/minded/util/MindfulnessBellSchedule.kt";

describe("the bell's count mirrors MindfulnessBellSchedule.kt (Kotlin ↔ TS)", () => {
  const source = readFileSync(resolve(process.cwd(), SCHEDULE), "utf8");

  it("defaults to the same count", () => {
    expect(source).toMatch(
      new RegExp(`DEFAULT_SLOTS_PER_DAY = ${DEFAULT_BELL_PER_DAY}\\b`),
    );
  });

  it("accepts exactly the counts the setting offers", () => {
    expect(source).toMatch(
      new RegExp(
        `SLOTS_PER_DAY_RANGE = ${BELL_PER_DAY_MIN}\\.\\.${BELL_PER_DAY_MAX}\\b`,
      ),
    );
  });
});
