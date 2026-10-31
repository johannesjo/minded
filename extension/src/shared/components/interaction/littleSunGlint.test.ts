import {
  getSecondsUntilReQuestion,
  isLittleSunGlintDue,
  LITTLE_SUN_GLINT_EVERY_S,
  LITTLE_SUN_GLINT_QUIET_BEFORE_PAUSE_S,
} from "./littleSunGlint";

describe("isLittleSunGlintDue", () => {
  it("glints once each interval, never at the start", () => {
    expect(isLittleSunGlintDue(0, null)).toBe(false);
    expect(isLittleSunGlintDue(LITTLE_SUN_GLINT_EVERY_S - 1, null)).toBe(false);
    expect(isLittleSunGlintDue(LITTLE_SUN_GLINT_EVERY_S, null)).toBe(true);
    expect(isLittleSunGlintDue(LITTLE_SUN_GLINT_EVERY_S + 1, null)).toBe(false);
    expect(isLittleSunGlintDue(LITTLE_SUN_GLINT_EVERY_S * 2, null)).toBe(true);
  });

  it("stays quiet when the pause is about to come back anyway", () => {
    const due = LITTLE_SUN_GLINT_EVERY_S;
    expect(
      isLittleSunGlintDue(due, LITTLE_SUN_GLINT_QUIET_BEFORE_PAUSE_S),
    ).toBe(false);
    expect(
      isLittleSunGlintDue(due, LITTLE_SUN_GLINT_QUIET_BEFORE_PAUSE_S + 1),
    ).toBe(true);
  });
});

describe("getSecondsUntilReQuestion", () => {
  // Mirrors LittleSun's re-question rule: v % 900 === 0 && v - initial > 300.
  const nextByRule = (sessionS: number, initialS: number): number => {
    let v = sessionS + 1;
    while (!(v % 900 === 0 && v - initialS > 300)) v++;
    return v - sessionS;
  };

  it.each([
    [0, 0],
    [299, 0],
    [600, 0],
    [899, 0],
    [900, 0],
    [700, 700],
    [1000, 700],
    [1100, 850],
  ])("matches the re-question tick at session %ss from %ss", (s, i) => {
    expect(getSecondsUntilReQuestion(s, i)).toBe(nextByRule(s, i));
  });
});
