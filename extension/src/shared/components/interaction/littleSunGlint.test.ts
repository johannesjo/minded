import {
  getLittleSunGlintEveryS,
  getSecondsUntilReQuestion,
  isLittleSunGlintDue,
  LITTLE_SUN_GLINT_DEFAULT_MINUTES,
  LITTLE_SUN_GLINT_QUIET_BEFORE_PAUSE_S,
} from "./littleSunGlint";

const LITTLE_SUN_GLINT_EVERY_S = LITTLE_SUN_GLINT_DEFAULT_MINUTES * 60;
const due = (s: number, untilPause: number | null) =>
  isLittleSunGlintDue(s, LITTLE_SUN_GLINT_EVERY_S, untilPause);

describe("isLittleSunGlintDue", () => {
  it("glints once each interval, never at the start", () => {
    expect(due(0, null)).toBe(false);
    expect(due(LITTLE_SUN_GLINT_EVERY_S - 1, null)).toBe(false);
    expect(due(LITTLE_SUN_GLINT_EVERY_S, null)).toBe(true);
    expect(due(LITTLE_SUN_GLINT_EVERY_S + 1, null)).toBe(false);
    expect(due(LITTLE_SUN_GLINT_EVERY_S * 2, null)).toBe(true);
  });

  it("stays quiet when the pause is about to come back anyway", () => {
    const at = LITTLE_SUN_GLINT_EVERY_S;
    expect(due(at, LITTLE_SUN_GLINT_QUIET_BEFORE_PAUSE_S)).toBe(false);
    expect(due(at, LITTLE_SUN_GLINT_QUIET_BEFORE_PAUSE_S + 1)).toBe(true);
  });
});

describe("getLittleSunGlintEveryS", () => {
  it("follows the chosen interval; off never glints", () => {
    expect(getLittleSunGlintEveryS(undefined)).toBe(LITTLE_SUN_GLINT_EVERY_S);
    expect(getLittleSunGlintEveryS(1)).toBe(60);
    expect(getLittleSunGlintEveryS(15)).toBe(15 * 60);
    expect(getLittleSunGlintEveryS(30)).toBe(30 * 60);
    // An interval the settings don't offer reads as the default.
    expect(getLittleSunGlintEveryS(7)).toBe(LITTLE_SUN_GLINT_EVERY_S);
    expect(getLittleSunGlintEveryS(0)).toBeNull();
    expect(isLittleSunGlintDue(LITTLE_SUN_GLINT_EVERY_S, null, null)).toBe(
      false,
    );
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
