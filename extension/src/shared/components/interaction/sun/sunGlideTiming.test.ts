import {
  ARRIVE_FROM_CORNER_MS,
  COMPANION_GLIDE_MS,
  EXIT_GLIDE_MS,
  GLIDE_DURATION_MS,
  settleGlideMs,
} from "./sunGlideTiming";
import {
  sunArriveSettle,
  sunCompanionSettle,
  sunDepartSettle,
} from "./sunSettle";

const SUN_COMPANION_SETTLE = sunCompanionSettle(40);

describe("settleGlideMs", () => {
  it("rises out of and returns to the companion on the slower glide", () => {
    expect(settleGlideMs(sunDepartSettle(), SUN_COMPANION_SETTLE)).toBe(
      COMPANION_GLIDE_MS,
    );
    expect(settleGlideMs(null, SUN_COMPANION_SETTLE)).toBe(COMPANION_GLIDE_MS);
  });

  it("arrives from the corner slowest, whichever way it leaves it", () => {
    // Back to the base out of the corner (an intervention re-shown after a
    // session timer), and into a settle from the widget's warmth-less sun.
    expect(settleGlideMs(null, sunArriveSettle())).toBe(ARRIVE_FROM_CORNER_MS);
    expect(settleGlideMs(SUN_COMPANION_SETTLE, sunArriveSettle())).toBe(
      ARRIVE_FROM_CORNER_MS,
    );
  });

  it("keeps the snappier defaults everywhere else", () => {
    expect(settleGlideMs(sunDepartSettle(), null)).toBe(GLIDE_DURATION_MS);
    // A departing (warm) corner settle isn't an arrival.
    expect(settleGlideMs(SUN_COMPANION_SETTLE, sunDepartSettle())).toBe(
      GLIDE_DURATION_MS,
    );
    expect(settleGlideMs(null, null)).toBe(EXIT_GLIDE_MS);
  });
});
