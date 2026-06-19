import { breathElapsedMs } from "./useBreathClock";

// The clock's reactive wiring (rAF, signals, origin resolution) is verified in
// the styleguide; the load-bearing pure logic is the clamp that turns an origin
// into an elapsed time the shared breath model can read (GitHub #27).
describe("breathElapsedMs", () => {
  it("measures from the origin once it is set", () => {
    expect(breathElapsedMs(10_000, 6_000)).toBe(4_000);
  });

  it("holds at 0 before the breath has an origin (the pre-start hold)", () => {
    // While the sun glides in, elapsed stays 0 (emptied breath).
    expect(breathElapsedMs(10_000, undefined)).toBe(0);
  });

  it("never goes negative if now precedes the origin", () => {
    expect(breathElapsedMs(5_000, 6_000)).toBe(0);
  });
});
