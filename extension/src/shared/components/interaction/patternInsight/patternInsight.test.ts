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
  targetUsageSeconds: 0,
  hasActiveTimer: false,
  hasExpiredTimerForTarget: false,
  hasIntentOnExpiredTimerForTarget: false,
  ...overrides,
});

describe("pattern insights", () => {
  it("returns no insight without a host target", () => {
    expect(
      getPatternInsightCandidate(
        baseContext({
          target: { kind: "app", id: "com.example" },
          targetUsageSeconds: 20 * 60,
        }),
      ),
    ).toBeUndefined();
  });

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

  it("prioritizes the present-session return loop over usage insights", () => {
    expect(
      getPatternInsightCandidate(
        baseContext({
          recentSunTaps: 3,
          targetUsageSeconds: 30 * 60,
        }),
      )?.id,
    ).toBe("return-loop");
  });

  it("stays the only insight for the day once shown, while the loop is active", () => {
    // The return loop leads the candidate list and there is no fall-through, so
    // once it has been shown it intentionally suppresses the usage stats for the
    // rest of the day while it stays eligible — the gentler noticing wins. This
    // documents that deliberate precedence.
    const state: PatternInsightState = {
      shownInsightIdsByDate: {
        "2026-05-11": ["return-loop"],
      },
    };

    expect(
      getPatternInsightCandidate(
        baseContext({
          recentSunTaps: 3,
          targetUsageSeconds: 30 * 60,
        }),
        state,
      ),
    ).toBeUndefined();
  });

  it("lets usage insights resurface once the return loop is no longer active", () => {
    // Suppression is bounded: when recentSunTaps drops back below the threshold
    // the return loop is no longer a candidate, so the usage insight returns.
    const state: PatternInsightState = {
      shownInsightIdsByDate: {
        "2026-05-11": ["return-loop"],
      },
    };

    expect(
      getPatternInsightCandidate(
        baseContext({
          recentSunTaps: 1,
          targetUsageSeconds: 18 * 60,
        }),
        state,
      )?.id,
    ).toBe("daily-usage:youtube.com");
  });

  it("creates a concrete daily usage insight once enough target usage exists", () => {
    expect(
      getPatternInsightCandidate(
        baseContext({
          targetUsageSeconds: 18 * 60,
          hasAlternatives: true,
        }),
      ),
    ).toEqual({
      id: "daily-usage:youtube.com",
      dateISO: "2026-05-11",
      message: "You've spent 18 minutes here today.",
      actions: ["still_on_purpose", "show_alternative", "leave_now"],
    });
  });

  it("does not create weak usage insights below the threshold", () => {
    expect(
      getPatternInsightCandidate(
        baseContext({
          targetUsageSeconds: 14 * 60,
        }),
      ),
    ).toBeUndefined();
  });

  it("skips insights already shown on the same date", () => {
    const state: PatternInsightState = {
      shownInsightIdsByDate: {
        "2026-05-11": ["daily-usage:youtube.com"],
      },
    };

    expect(
      getPatternInsightCandidate(
        baseContext({
          targetUsageSeconds: 18 * 60,
        }),
        state,
      ),
    ).toBeUndefined();
  });

  it("treats partial old state as empty", () => {
    expect(
      getPatternInsightCandidate(
        baseContext({
          targetUsageSeconds: 18 * 60,
        }),
        {} as PatternInsightState,
      )?.id,
    ).toBe("daily-usage:youtube.com");
  });

  it("records shown insight IDs once per date", () => {
    const first = markPatternInsightShownInState(
      undefined,
      "daily-usage:youtube.com",
      "2026-05-11",
    );
    const second = markPatternInsightShownInState(
      first,
      "daily-usage:youtube.com",
      "2026-05-11",
    );

    expect(second).toEqual({
      shownInsightIdsByDate: {
        "2026-05-11": ["daily-usage:youtube.com"],
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
      "daily-usage:youtube.com",
      "2026-05-11",
    );

    expect(Object.keys(next.shownInsightIdsByDate)).toHaveLength(60);
    expect(next.shownInsightIdsByDate["2026-05-11"]).toEqual([
      "daily-usage:youtube.com",
    ]);
    expect(next.shownInsightIdsByDate["2026-02-25"]).toBeUndefined();
  });
});
