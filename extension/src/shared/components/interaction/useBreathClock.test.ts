import { breathElapsedMs } from "./useBreathClock";

// The clock's reactive wiring (rAF, signals) is verified in the styleguide; the
// load-bearing pure logic is how it resolves the origin into an elapsed time,
// which is what keeps the sun and the cue on one shared clock (GitHub #27).
describe("breathElapsedMs", () => {
  it("measures from the origin once it is set", () => {
    expect(breathElapsedMs(10_000, 6_000)).toBe(4_000);
  });

  it("holds at 0 before the breath has begun (no origin, no fallback)", () => {
    // The pre-start hold while the sun glides in: elapsed stays 0 (emptied breath).
    expect(breathElapsedMs(10_000, undefined)).toBe(0);
  });

  it("falls back to the mount origin when the primary origin is unset", () => {
    // Reduced-motion follow mode: the frozen sun never publishes an origin, so the
    // countdown runs off the mount origin instead.
    expect(breathElapsedMs(10_000, undefined, 6_000)).toBe(4_000);
  });

  it("prefers the real origin over the fallback once it lands", () => {
    expect(breathElapsedMs(10_000, 9_000, 6_000)).toBe(1_000);
  });

  it("never goes negative if now precedes the origin", () => {
    expect(breathElapsedMs(5_000, 6_000)).toBe(0);
  });
});
