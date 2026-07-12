import { evaluateScreenOff, SCREEN_OFF_TARGET_MS } from "./screenOffEval";

describe("evaluateScreenOff", () => {
  it("succeeds when the away segment exactly meets the target", () => {
    const result = evaluateScreenOff({
      hiddenAt: 1_000,
      shownAt: 1_000 + SCREEN_OFF_TARGET_MS,
      targetMs: SCREEN_OFF_TARGET_MS,
    });

    expect(result).toEqual({
      elapsedMs: SCREEN_OFF_TARGET_MS,
      success: true,
    });
  });

  it("fails when the user returns one millisecond early", () => {
    const result = evaluateScreenOff({
      hiddenAt: 0,
      shownAt: SCREEN_OFF_TARGET_MS - 1,
      targetMs: SCREEN_OFF_TARGET_MS,
    });

    expect(result).toEqual({
      elapsedMs: SCREEN_OFF_TARGET_MS - 1,
      success: false,
    });
  });

  it("fails a zero-length segment", () => {
    const result = evaluateScreenOff({
      hiddenAt: 5_000,
      shownAt: 5_000,
      targetMs: SCREEN_OFF_TARGET_MS,
    });

    expect(result).toEqual({
      elapsedMs: 0,
      success: false,
    });
  });

  it("clamps negative elapsed time from clock skew to zero", () => {
    const result = evaluateScreenOff({
      hiddenAt: 10_000,
      shownAt: 9_000,
      targetMs: SCREEN_OFF_TARGET_MS,
    });

    expect(result).toEqual({
      elapsedMs: 0,
      success: false,
    });
  });

  it("succeeds when the device slept far past the target", () => {
    const result = evaluateScreenOff({
      hiddenAt: 0,
      shownAt: 10 * 60_000,
      targetMs: SCREEN_OFF_TARGET_MS,
    });

    expect(result).toEqual({
      elapsedMs: 10 * 60_000,
      success: true,
    });
  });
});
