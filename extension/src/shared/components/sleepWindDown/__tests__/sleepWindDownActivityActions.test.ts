import { getSleepWindDownActivityAction } from "../sleepWindDownActivityActions";
import type { SleepWindDownActivityKey } from "../sleepWindDownActivityActions";

describe("sleep wind-down activity actions", () => {
  it.each<SleepWindDownActivityKey>(["breathing", "calmRead"])(
    "uses a menu return action instead of a Done action for %s",
    (activityKey) => {
      expect(getSleepWindDownActivityAction(activityKey)).toBe("return");
    },
  );

  it.each<SleepWindDownActivityKey>([
    "brainDump",
    "gratitude",
    "tomorrow",
    "tips",
  ])("keeps the Done action for %s", (activityKey) => {
    expect(getSleepWindDownActivityAction(activityKey)).toBe("complete");
  });
});
