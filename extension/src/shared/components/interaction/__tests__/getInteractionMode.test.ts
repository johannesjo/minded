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
        sunTaps: { [TODAY]: 5 },
      }),
      { isMainView: false },
    );

    expect(decision).toEqual({
      mode: "SHOW_REASON",
      reason: "strong_friction_saved_reason",
      frictionLevel: "strong",
    });
  });

  it("uses alternatives for strong friction when no saved reason exists", () => {
    const decision = decide(
      baseSyncData({
        alternativeWebsites: ["https://example.com"],
        sunTaps: { [TODAY]: 5 },
      }),
      { isMainView: false },
    );

    expect(decision).toEqual({
      mode: "SHOW_ALTERNATIVE",
      reason: "strong_friction_alternative",
      frictionLevel: "strong",
    });
  });

  it("asks for missing mood data deterministically", () => {
    expect(decide(baseSyncData({ moodCheckTS: 99 }))).toEqual({
      mode: "MOOD_CHECKIN",
      reason: "mood_missing",
      frictionLevel: "normal",
    });
  });

  it("asks for missing energy data during daytime after mood is fresh", () => {
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

  it("samples stale same-day mood checks without treating them as missing", () => {
    expect(
      decide(
        baseSyncData({
          moodCheckTS: NOW - 3 * 60 * 60 * 1000,
        }),
        {
          random: sequenceRandom([0.99, 0.01]),
        },
      ),
    ).toEqual({
      mode: "MOOD_CHECKIN",
      reason: "mood_checkin_stale_sample",
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
          random: sequenceRandom([0.99, 0.01]),
        },
      ),
    ).toEqual({
      mode: "APP_USAGE_OR_BROWSING_BEHAVIOR",
      reason: "usage_rating_due",
      frictionLevel: "soft",
    });
  });

  it("samples emoji check-in as a final low-probability fallback", () => {
    expect(
      decide(baseSyncData(), {
        random: sequenceRandom([0.99, 0.99, 0.005]),
      }),
    ).toEqual({
      mode: "EMOJI_CHECKIN",
      reason: "emoji_checkin_sample",
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
