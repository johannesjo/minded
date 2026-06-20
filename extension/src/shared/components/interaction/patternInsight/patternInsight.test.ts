import type { PatternInsightState } from "@src/dataInterface/syncData";
import type { InteractionContext } from "@src/shared/components/interaction/interactionContext";
import {
  getPatternInsightCandidate,
  markPatternInsightShownInState,
} from "./patternInsight";

const baseContext = (
  overrides: Partial<InteractionContext> = {},
): InteractionContext => ({
  now: new Date("2026-05-11T10:00:00").getTime(),
  dateISO: "2026-05-11",
  localHour: 10,
  target: { kind: "host", id: "youtube.com" },
  platform: "web",
  answerCount: 3,
  hasFewAnswers: false,
  hasFreshMood: true,
  moodCheckAgeMs: 0,
  hasFreshEnergy: true,
  isEvening: false,
  alternativeCount: 0,
  hasAlternatives: false,
  todayOpeningAttempts: 2,
  todaySunTaps: 1,
  recentSunTaps: 1,
  todayUsageSeconds: 0,
  hasActiveTimer: false,
  hasExpiredTimerForTarget: false,
  hasIntentOnExpiredTimerForTarget: false,
  ...overrides,
});

describe("pattern insights", () => {
  it("notices a present-session return loop once enough recent returns exist", () => {
    expect(
      getPatternInsightCandidate(
        baseContext({
          recentSunTaps: 3,
        }),
      ),
    ).toEqual({
      id: "return-loop",
      dateISO: "2026-05-11",
      message:
        "You've come back a few times in a short while. That's okay — see if you can just notice the pull, without having to act on it.",
      actions: ["still_on_purpose", "leave_now"],
    });
  });

  it("does not notice a return loop below the threshold", () => {
    expect(
      getPatternInsightCandidate(
        baseContext({
          recentSunTaps: 2,
        }),
      ),
    ).toBeUndefined();
  });

  it("notices a return loop even on an app target with no host scope", () => {
    expect(
      getPatternInsightCandidate(
        baseContext({
          target: { kind: "app", id: "com.example" },
          recentSunTaps: 4,
        }),
      )?.id,
    ).toBe("return-loop");
  });

  it("offers the alternative action when alternatives exist", () => {
    expect(
      getPatternInsightCandidate(
        baseContext({
          recentSunTaps: 3,
          hasAlternatives: true,
        }),
      )?.actions,
    ).toEqual(["still_on_purpose", "show_alternative", "leave_now"]);
  });

  it("suppresses the return loop for the rest of the day once shown", () => {
    const state: PatternInsightState = {
      shownInsightIdsByDate: {
        "2026-05-11": ["return-loop"],
      },
    };

    expect(
      getPatternInsightCandidate(
        baseContext({
          recentSunTaps: 3,
        }),
        state,
      ),
    ).toBeUndefined();
  });

  it("treats partial old state as empty", () => {
    expect(
      getPatternInsightCandidate(
        baseContext({
          recentSunTaps: 3,
        }),
        {} as PatternInsightState,
      )?.id,
    ).toBe("return-loop");
  });

  it("records shown insight IDs once per date", () => {
    const first = markPatternInsightShownInState(
      undefined,
      "return-loop",
      "2026-05-11",
    );
    const second = markPatternInsightShownInState(
      first,
      "return-loop",
      "2026-05-11",
    );

    expect(second).toEqual({
      shownInsightIdsByDate: {
        "2026-05-11": ["return-loop"],
      },
    });
  });

  it("keeps only recent date buckets when recording shown insights", () => {
    const shownInsightIdsByDate = Object.fromEntries(
      Array.from({ length: 70 }, (_, index) => {
        const date = new Date("2026-02-25T00:00:00.000Z");
        date.setUTCDate(date.getUTCDate() + index);
        return [date.toISOString().slice(0, 10), ["old-insight"]];
      }),
    );

    const next = markPatternInsightShownInState(
      { shownInsightIdsByDate },
      "return-loop",
      "2026-05-11",
    );

    expect(Object.keys(next.shownInsightIdsByDate)).toHaveLength(60);
    expect(next.shownInsightIdsByDate["2026-05-11"]).toEqual(["return-loop"]);
    expect(next.shownInsightIdsByDate["2026-02-25"]).toBeUndefined();
  });
});
