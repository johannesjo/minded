import {
  getInteractionMode,
  getInteractionModeDecision,
  InteractionModeDecisionOptions,
} from "../getInteractionMode";
import { createMockSyncData } from "@src/test-utils/mockHelpers";
import { QuestionCategoryId } from "@src/shared/data/questions";
import type { Answer, SyncData } from "@src/dataInterface/syncData";

jest.mock("@src/dataInterface/commonSyncDataInterface", () => ({
  IS_ANDROID: false,
  IS_APP: false,
  IS_IOS: false,
}));

const NOW = new Date("2026-05-11T10:00:00").getTime();
const EVENING = new Date("2026-05-11T20:00:00").getTime();
const TODAY = "2026-05-11";
const ONE_HOUR = 60 * 60 * 1000;
const RECENT_SUN_TAPS = [
  NOW - 4 * ONE_HOUR,
  NOW - 3 * ONE_HOUR,
  NOW - 2 * ONE_HOUR,
  NOW - ONE_HOUR,
  NOW,
];

// Forces strong friction via the "many attempts today" path so a test can
// exercise the other strong-friction prompts without also tripping the
// present-session return-loop noticing (which keys off recentSunTaps).
const strongFrictionViaAttempts = (): Partial<SyncData> => ({
  attempts: { [TODAY]: 10 },
  sunTaps: { [TODAY]: 1 },
  sunTapTimestamps: [NOW],
});

const sequenceRandom = (values: number[]): (() => number) => {
  let index = 0;
  return () => values[index++] ?? 0.99;
};

const answer = (
  id: string,
  questionCategoryId = QuestionCategoryId.Gratitude,
): Answer => ({
  id,
  qid: null,
  questionCategoryId,
  val: `answer ${id}`,
  ts: NOW,
});

const baseSyncData = (overrides: Partial<SyncData> = {}): SyncData =>
  createMockSyncData({
    answers: [answer("1"), answer("2"), answer("3")],
    moodCheckTS: NOW,
    energyLvlTS: NOW,
    emotionLabeling: { ts: NOW, emotions: [], bodyLocations: [] },
    lastBrowsingBehaviorRatingTS: NOW,
    lastAppUsageRatingTS: NOW,
    ...overrides,
  });

const decide = (
  syncData: SyncData,
  options: InteractionModeDecisionOptions = {},
) =>
  getInteractionModeDecision(syncData, {
    clock: () => NOW,
    random: () => 0.99,
    isMainView: true,
    isApp: false,
    isAndroid: false,
    platform: "web",
    ...options,
  });

describe("getInteractionMode", () => {
  it("keeps the public wrapper returning only the selected mode", () => {
    const syncData = createMockSyncData({ answers: [] });

    expect(
      getInteractionMode(syncData, {
        clock: () => NOW,
        isMainView: true,
        platform: "web",
      }),
    ).toBe("QUESTION");
    expect(decide(syncData)).toEqual({
      mode: "QUESTION",
      reason: "few_answers_question",
      frictionLevel: "normal",
    });
  });

  it("uses saved reasons for strong friction when available", () => {
    const decision = decide(
      baseSyncData({
        answers: [
          answer("1", QuestionCategoryId.WhyReduceBrowsing),
          answer("2"),
        ],
        ...strongFrictionViaAttempts(),
      }),
      { isMainView: false },
    );

    expect(decision).toEqual({
      mode: "SHOW_REASON",
      reason: "strong_friction_saved_reason",
      frictionLevel: "strong",
    });
  });

  it("does not force saved reasons for dashboard-triggered strong friction interactions", () => {
    const decision = decide(
      baseSyncData({
        answers: [
          answer("1", QuestionCategoryId.WhyReduceBrowsing),
          answer("2"),
        ],
        sunTaps: { [TODAY]: 5 },
        sunTapTimestamps: RECENT_SUN_TAPS,
      }),
      {
        isMainView: true,
        random: () => 0.99,
      },
    );

    expect(decision).toEqual({
      mode: "QUESTION",
      reason: "fallback_question",
      frictionLevel: "strong",
    });
  });

  it("uses pattern insights before other strong friction prompts when available", () => {
    const decision = decide(
      baseSyncData({
        answers: [
          answer("1", QuestionCategoryId.WhyReduceBrowsing),
          answer("2"),
        ],
        alternativeWebsites: ["https://example.com"],
        sunTaps: { [TODAY]: 5 },
        sunTapTimestamps: RECENT_SUN_TAPS,
      }),
      {
        isMainView: false,
        target: { kind: "host", id: "youtube.com" },
      },
    );

    expect(decision).toEqual({
      mode: "PATTERN_INSIGHT",
      reason: "strong_friction_pattern_insight",
      frictionLevel: "strong",
      patternInsight: {
        id: "return-loop",
        dateISO: TODAY,
        message:
          "You've come back a few times in a short while. That's okay — see if you can just notice the pull, without having to act on it.",
        actions: ["still_on_purpose", "show_alternative", "leave_now"],
      },
    });
  });

  it("gently names a present-session return loop in strong friction", () => {
    // Strong friction here comes from repeated recent returns, which is exactly
    // what the return-loop noticing observes — so it surfaces (once per day)
    // ahead of the saved-reason / alternative / question prompts.
    const decision = decide(
      baseSyncData({
        answers: [
          answer("1", QuestionCategoryId.WhyReduceBrowsing),
          answer("2"),
        ],
        sunTaps: { [TODAY]: 5 },
        sunTapTimestamps: RECENT_SUN_TAPS,
      }),
      { isMainView: false },
    );

    expect(decision.mode).toBe("PATTERN_INSIGHT");
    expect(decision.patternInsight?.id).toBe("return-loop");
    expect(decision.frictionLevel).toBe("strong");
  });

  it("does not let strong friction preempt required energy checks", () => {
    const decision = decide(
      baseSyncData({
        energyLvlTS: 99,
        ...strongFrictionViaAttempts(),
      }),
      {
        isMainView: false,
        target: { kind: "host", id: "youtube.com" },
      },
    );

    expect(decision).toEqual({
      mode: "ENERGY_LVL",
      reason: "energy_missing",
      frictionLevel: "strong",
    });
  });

  it("uses alternatives for strong friction when no saved reason exists", () => {
    const decision = decide(
      baseSyncData({
        alternativeWebsites: ["https://example.com"],
        ...strongFrictionViaAttempts(),
      }),
      { isMainView: false },
    );

    expect(decision).toEqual({
      mode: "SHOW_ALTERNATIVE",
      reason: "strong_friction_alternative",
      frictionLevel: "strong",
    });
  });

  describe("screen-off minute (strong friction, Android)", () => {
    const strongAndroid = (options: InteractionModeDecisionOptions = {}) =>
      decide(
        baseSyncData({
          ...strongFrictionViaAttempts(),
        }),
        {
          isMainView: false,
          isAndroid: true,
          platform: "android",
          ...options,
        },
      );

    it("offers a screen-off minute when the probability roll passes", () => {
      expect(strongAndroid({ random: () => 0 })).toEqual({
        mode: "SCREEN_OFF",
        reason: "screen_off_strong",
        frictionLevel: "strong",
      });
    });

    it("falls through to the usual strong-friction prompt when the roll fails", () => {
      expect(strongAndroid({ random: () => 0.99 })).toEqual({
        mode: "QUESTION",
        reason: "strong_friction_question",
        frictionLevel: "strong",
      });
    });

    it("never offers a screen-off minute on non-Android platforms", () => {
      // With every roll at 0 the screen-off gate is the only thing that could
      // fire it; on web it is skipped, falling through to the cross-platform
      // urge-surfing practice instead.
      const decision = decide(
        baseSyncData({
          sunTaps: { [TODAY]: 5 },
          sunTapTimestamps: RECENT_SUN_TAPS,
        }),
        { isMainView: false, random: () => 0 },
      );

      expect(decision.mode).not.toBe("SCREEN_OFF");
      expect(decision).toEqual({
        mode: "URGE_SURFING",
        reason: "urge_surfing_strong",
        frictionLevel: "strong",
      });
    });
  });

  describe("urge surfing (strong friction, any platform)", () => {
    const strongWeb = (options: InteractionModeDecisionOptions = {}) =>
      decide(
        baseSyncData({
          ...strongFrictionViaAttempts(),
        }),
        { isMainView: false, ...options },
      );

    it("offers urge surfing when the probability roll passes", () => {
      expect(strongWeb({ random: () => 0 })).toEqual({
        mode: "URGE_SURFING",
        reason: "urge_surfing_strong",
        frictionLevel: "strong",
      });
    });

    it("offers it on Android once the screen-off roll has failed", () => {
      // First roll fails the screen-off gate, second roll passes urge surfing.
      expect(
        strongWeb({
          isAndroid: true,
          platform: "android",
          random: sequenceRandom([0.99, 0]),
        }),
      ).toEqual({
        mode: "URGE_SURFING",
        reason: "urge_surfing_strong",
        frictionLevel: "strong",
      });
    });

    it("falls through to the usual strong-friction prompt when the roll fails", () => {
      expect(strongWeb({ random: () => 0.99 })).toEqual({
        mode: "QUESTION",
        reason: "strong_friction_question",
        frictionLevel: "strong",
      });
    });

    it("does not fire outside waking hours", () => {
      const lateNight = new Date("2026-05-11T03:00:00").getTime();
      expect(
        strongWeb({ clock: () => lateNight, random: () => 0 }).mode,
      ).not.toBe("URGE_SURFING");
    });
  });

  it("asks for missing energy data during daytime", () => {
    expect(decide(baseSyncData({ energyLvlTS: 99 }))).toEqual({
      mode: "ENERGY_LVL",
      reason: "energy_missing",
      frictionLevel: "normal",
    });
  });

  it("uses low-cognitive-load action advice in the evening", () => {
    expect(
      decide(baseSyncData(), {
        clock: () => EVENING,
      }),
    ).toEqual({
      mode: "ACTION_ADVICE",
      reason: "evening_action_advice",
      frictionLevel: "normal",
    });
  });

  it("samples alternatives more often when they are contextually eligible", () => {
    expect(
      decide(
        baseSyncData({
          alternativeWebsites: ["https://example.com"],
        }),
        {
          isMainView: false,
          random: () => 0.2,
        },
      ),
    ).toEqual({
      mode: "SHOW_ALTERNATIVE",
      reason: "contextual_alternative",
      frictionLevel: "soft",
    });
  });

  it("samples set-alternative prompts when no alternatives exist", () => {
    expect(
      decide(baseSyncData(), {
        isMainView: false,
        random: () => 0.05,
      }),
    ).toEqual({
      mode: "SET_ALTERNATIVE",
      reason: "contextual_set_alternative",
      frictionLevel: "soft",
    });
  });

  it("samples pattern insights in normal friction when enough data exists", () => {
    expect(
      decide(
        baseSyncData({
          // Three recent returns → return-loop insight is eligible, but not the
          // five that would push friction to strong.
          sunTaps: { [TODAY]: 3 },
          sunTapTimestamps: [NOW - 2 * ONE_HOUR, NOW - ONE_HOUR, NOW],
        }),
        {
          isMainView: false,
          target: { kind: "host", id: "youtube.com" },
          random: () => 0.2,
        },
      ),
    ).toEqual({
      mode: "PATTERN_INSIGHT",
      reason: "contextual_pattern_insight",
      frictionLevel: "normal",
      patternInsight: {
        id: "return-loop",
        dateISO: TODAY,
        message:
          "You've come back a few times in a short while. That's okay — see if you can just notice the pull, without having to act on it.",
        actions: ["still_on_purpose", "leave_now"],
      },
    });
  });

  it("preserves contextual alternative sampling when a pattern insight misses", () => {
    expect(
      decide(
        baseSyncData({
          alternativeWebsites: ["https://example.com"],
          sunTaps: { [TODAY]: 3 },
          sunTapTimestamps: [NOW - 2 * ONE_HOUR, NOW - ONE_HOUR, NOW],
        }),
        {
          isMainView: false,
          target: { kind: "host", id: "youtube.com" },
          random: () => 0.4,
        },
      ),
    ).toEqual({
      mode: "SHOW_ALTERNATIVE",
      reason: "contextual_alternative",
      frictionLevel: "normal",
    });
  });

  it("keeps randomness injectable for fallback samples", () => {
    expect(
      decide(baseSyncData(), {
        random: () => 0.05,
      }),
    ).toEqual({
      mode: "SELF_ASSESSMENT",
      reason: "self_assessment_sample",
      frictionLevel: "soft",
    });
  });

  it("samples emotion labeling only when emotion data is not fresh", () => {
    expect(
      decide(
        baseSyncData({
          emotionLabeling: { ts: 99, emotions: [], bodyLocations: [] },
        }),
        {
          random: sequenceRandom([0.99, 0.05]),
        },
      ),
    ).toEqual({
      mode: "EMOTION_LABELING",
      reason: "emotion_labeling_sample",
      frictionLevel: "soft",
    });
  });

  it("samples saved reason reminders in otherwise stable context", () => {
    expect(
      decide(
        baseSyncData({
          answers: [
            answer("1", QuestionCategoryId.WhyReduceBrowsing),
            answer("2"),
          ],
        }),
        {
          random: sequenceRandom([0.99, 0.01]),
        },
      ),
    ).toEqual({
      mode: "SHOW_REASON",
      reason: "saved_reason_sample",
      frictionLevel: "soft",
    });
  });

  it("samples usage rating when the relevant rating is stale", () => {
    expect(
      decide(
        baseSyncData({
          lastBrowsingBehaviorRatingTS: 99,
        }),
        {
          isMainView: false,
          random: sequenceRandom([0.99, 0.99, 0.01]),
        },
      ),
    ).toEqual({
      mode: "APP_USAGE_OR_BROWSING_BEHAVIOR",
      reason: "usage_rating_due",
      frictionLevel: "soft",
    });
  });

  it("does not show the usage observation when starting from the dashboard", () => {
    // From the dashboard (isMainView) the usage observation is suppressed even
    // when the rating is stale and every roll would otherwise select it; the
    // flow falls through to a real intervention instead.
    expect(
      decide(
        baseSyncData({
          lastBrowsingBehaviorRatingTS: 99,
        }),
        {
          isMainView: true,
          random: sequenceRandom([0.99, 0.01]),
        },
      ).mode,
    ).not.toBe("APP_USAGE_OR_BROWSING_BEHAVIOR");
  });

  it("samples a notice micro-action just before the question fallback", () => {
    // Self-assessment and action advice both fail their rolls; the notice
    // roll then passes, surfacing the present-moment anchor.
    expect(
      decide(baseSyncData(), {
        random: sequenceRandom([0.99, 0.99, 0.01]),
      }),
    ).toEqual({
      mode: "NOTICE",
      reason: "notice_sample",
      frictionLevel: "soft",
    });
  });

  it("falls back to a question when no contextual or sampled mode is selected", () => {
    expect(decide(baseSyncData())).toEqual({
      mode: "QUESTION",
      reason: "fallback_question",
      frictionLevel: "soft",
    });
  });
});
