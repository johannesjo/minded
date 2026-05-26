import {
  RESET_WEBSITE_USAGE_DURATION_THRESHOLD_MS,
  getEffectiveSessionDurationS,
} from "../sessionDuration";

describe("getEffectiveSessionDurationS", () => {
  const NOW = new Date("2026-05-15T10:00:00").getTime();

  it("returns 0 when no host data exists", () => {
    expect(getEffectiveSessionDurationS(null, NOW)).toBe(0);
    expect(getEffectiveSessionDurationS(undefined, NOW)).toBe(0);
  });

  it("returns 0 when the session is stale (gap > 30min)", () => {
    expect(
      getEffectiveSessionDurationS(
        {
          lastUsedTS: NOW - RESET_WEBSITE_USAGE_DURATION_THRESHOLD_MS - 1,
          sessionDurationInS: 600,
        },
        NOW,
      ),
    ).toBe(0);
  });

  it("returns stored duration when within reset threshold", () => {
    expect(
      getEffectiveSessionDurationS(
        {
          lastUsedTS: NOW - 5 * 60 * 1000,
          sessionDurationInS: 120,
        },
        NOW,
      ),
    ).toBe(120);
  });

  it("clamps negative durations to 0", () => {
    expect(
      getEffectiveSessionDurationS(
        { lastUsedTS: NOW, sessionDurationInS: -5 },
        NOW,
      ),
    ).toBe(0);
  });
});
