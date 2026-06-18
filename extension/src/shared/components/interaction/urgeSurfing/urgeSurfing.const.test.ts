import { getSurfCue, getSurfDurationMs, SURF_CUES } from "./urgeSurfing.const";

describe("getSurfDurationMs", () => {
  it("rides a longer wave the stronger the pull", () => {
    expect(getSurfDurationMs("soft")).toBeLessThan(getSurfDurationMs("normal"));
    expect(getSurfDurationMs("normal")).toBeLessThan(
      getSurfDurationMs("strong"),
    );
  });
});

describe("getSurfCue", () => {
  it("walks through the cues as the wave progresses", () => {
    expect(getSurfCue(0)).toBe(SURF_CUES[0].text);
    expect(getSurfCue(0.3)).toBe(SURF_CUES[1].text);
    expect(getSurfCue(0.6)).toBe(SURF_CUES[2].text);
    expect(getSurfCue(0.9)).toBe(SURF_CUES[3].text);
  });

  it("returns the closing cue at and past the end of the wave", () => {
    const last = SURF_CUES[SURF_CUES.length - 1].text;
    expect(getSurfCue(1)).toBe(last);
    // Defensive: a fraction can never exceed 1 in practice (it is clamped), but
    // the helper must still resolve rather than return undefined.
    expect(getSurfCue(1.5)).toBe(last);
  });
});
