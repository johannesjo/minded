import {
  BREATH_PAUSE_PATTERN,
  breathCycleMs,
  breathCycleSeconds,
  CUE_FADE_MS,
  getBreathStateAt,
  getCueOpacity,
  type BreathPattern,
} from "./breathTimeline";

const PATTERN: BreathPattern = {
  inhaleMs: 4000,
  holdMs: 2000,
  exhaleMs: 6000,
};

describe("breathTimeline", () => {
  it("sums the cycle length", () => {
    expect(breathCycleMs(PATTERN)).toBe(12000);
    expect(breathCycleSeconds(PATTERN)).toBe(12);
  });

  it("starts emptied and fills to the peak across the inhale", () => {
    expect(getBreathStateAt(0, PATTERN).phase).toBe("inhale");
    expect(getBreathStateAt(0, PATTERN).fill).toBeCloseTo(0);
    // Eased, so the midpoint of the inhale is at half fill.
    expect(getBreathStateAt(2000, PATTERN).fill).toBeCloseTo(0.5);
    // End of inhale is full.
    expect(getBreathStateAt(3999, PATTERN).fill).toBeGreaterThan(0.99);
  });

  it("holds full through the hold phase", () => {
    expect(getBreathStateAt(4000, PATTERN)).toMatchObject({
      phase: "hold",
      fill: 1,
    });
    expect(getBreathStateAt(5999, PATTERN)).toMatchObject({
      phase: "hold",
      fill: 1,
    });
  });

  it("empties back down across the exhale and ends at zero", () => {
    expect(getBreathStateAt(6000, PATTERN).phase).toBe("exhale");
    expect(getBreathStateAt(6000, PATTERN).fill).toBeCloseTo(1);
    expect(getBreathStateAt(9000, PATTERN).fill).toBeCloseTo(0.5);
    expect(getBreathStateAt(12000, PATTERN).fill).toBeCloseTo(0);
  });

  it("counts down whole seconds within each phase", () => {
    expect(getBreathStateAt(0, PATTERN).phaseSecondsLeft).toBe(4); // inhale
    expect(getBreathStateAt(4000, PATTERN).phaseSecondsLeft).toBe(2); // hold
    expect(getBreathStateAt(6000, PATTERN).phaseSecondsLeft).toBe(6); // exhale
  });

  it("clamps past the end to a full release when not looping", () => {
    expect(getBreathStateAt(99999, PATTERN)).toMatchObject({
      phase: "exhale",
      fill: 0,
      phaseSecondsLeft: 0,
    });
  });

  it("repeats the cycle when looping", () => {
    const atStart = getBreathStateAt(100, PATTERN);
    const oneCycleLater = getBreathStateAt(12100, PATTERN, { loop: true });
    expect(oneCycleLater.phase).toBe(atStart.phase);
    expect(oneCycleLater.fill).toBeCloseTo(atStart.fill);
  });

  it("ships a 12s intervention-pause preset", () => {
    expect(breathCycleSeconds(BREATH_PAUSE_PATTERN)).toBe(12);
  });

  describe("getCueOpacity", () => {
    it("fades the cue to 0 at each phase boundary and back to 1 mid-phase", () => {
      // Phase start (inhale begins): faded out.
      expect(getCueOpacity(getBreathStateAt(0, PATTERN))).toBeCloseTo(0);
      // Well inside the inhale: fully visible.
      expect(getCueOpacity(getBreathStateAt(2000, PATTERN))).toBe(1);
      // Just before the inhale→hold boundary: faded back out.
      expect(getCueOpacity(getBreathStateAt(4000 - 1, PATTERN))).toBeCloseTo(
        0,
        1,
      );
      // Just after the boundary (hold begun): still near 0, on its way back up.
      expect(getCueOpacity(getBreathStateAt(4000 + 1, PATTERN))).toBeCloseTo(
        0,
        1,
      );
    });

    it("reaches full opacity once the fade window has passed", () => {
      expect(getCueOpacity(getBreathStateAt(CUE_FADE_MS, PATTERN))).toBeCloseTo(
        1,
      );
    });
  });
});
