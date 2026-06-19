import {
  getBreathStartedAt,
  isShellSunInteractive,
  setBreathStartedAt,
} from "./sunStore";
import type { SunPhase } from "./sunSettle";

// Regression guard for the shell-sun hand-off race: when the sun interaction
// completes, the choice buttons mount before the role flips out of "interactive"
// (the flip is deferred to a rAF). If the disc stayed interactive during that
// window it would sit, full-size and centred, over the just-shown buttons and eat
// their taps — worst on a backgrounded tab where the rAF is paused. The disc must
// therefore be inert as soon as the hand-off is in flight, even while the role is
// still "interactive". See getIsSunHandoffInFlight.
describe("isShellSunInteractive", () => {
  it("is interactive only in the live interactive role with no hand-off", () => {
    expect(isShellSunInteractive("interactive", false)).toBe(true);
  });

  it("goes inert the moment a choices hand-off is in flight", () => {
    // The load-bearing case: role is still "interactive" but the disc must not
    // grab taps meant for the choices mounting above it.
    expect(isShellSunInteractive("interactive", true)).toBe(false);
  });

  it("is never interactive in any non-interactive role", () => {
    const others: SunPhase[] = [
      "companion",
      "breathing",
      "surfing",
      "resting",
      "departing",
    ];
    for (const role of others) {
      expect(isShellSunInteractive(role, false)).toBe(false);
      expect(isShellSunInteractive(role, true)).toBe(false);
    }
  });
});

// The shared breath origin (GitHub #27): the sun publishes its breath start here
// and the breath-pause cue reads the same value, so the disc and the cue can't
// drift. Its lifecycle is start-on-glide, clear-on-leave-breathing.
describe("breathStartedAt", () => {
  afterEach(() => setBreathStartedAt(undefined));

  it("starts unset (the breath has not begun)", () => {
    expect(getBreathStartedAt()).toBeUndefined();
  });

  it("carries the published origin once the breath begins", () => {
    setBreathStartedAt(1_234);
    expect(getBreathStartedAt()).toBe(1_234);
  });

  it("clears back to undefined when leaving the breathing phase", () => {
    setBreathStartedAt(1_234);
    setBreathStartedAt(undefined);
    expect(getBreathStartedAt()).toBeUndefined();
  });
});
