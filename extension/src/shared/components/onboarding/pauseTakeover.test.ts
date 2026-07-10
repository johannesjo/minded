import { shouldPauseDriveSun } from "./pauseTakeover";

describe("shouldPauseDriveSun (tap-to-pause demo takeover)", () => {
  const base = {
    isPauseShown: true,
    isPauseClosing: false,
    hasPauseTakenOver: true,
    sunRole: "interactive",
  };

  it("never drives while no pause is shown", () => {
    expect(shouldPauseDriveSun({ ...base, isPauseShown: false })).toBe(false);
  });

  it("holds the flow's own rest until the interaction's first role flip (no companion dive at open)", () => {
    expect(
      shouldPauseDriveSun({
        ...base,
        hasPauseTakenOver: false,
        sunRole: "companion",
      }),
    ).toBe(false);
  });

  it("drives from the first non-companion role even before the takeover flag lands", () => {
    expect(shouldPauseDriveSun({ ...base, hasPauseTakenOver: false })).toBe(
      true,
    );
  });

  it("keeps driving a mid-pause companion rest (grounding parks the disc on the bar)", () => {
    expect(shouldPauseDriveSun({ ...base, sunRole: "companion" })).toBe(true);
  });

  it("hands the disc back the instant the closing fade begins", () => {
    expect(shouldPauseDriveSun({ ...base, isPauseClosing: true })).toBe(false);
  });
});
