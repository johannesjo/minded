import { getFrictionLevel, getInteractionContext } from "../interactionContext";
import { createMockSyncData } from "@src/test-utils/mockHelpers";
import { QuestionCategoryId } from "@src/shared/data/questions";
import type { Answer } from "@src/dataInterface/syncData";

const NOW = new Date("2026-05-11T10:00:00").getTime();
const TODAY = "2026-05-11";

const answers = (count: number): Answer[] =>
  Array.from({ length: count }, (_, index) => ({
    id: `${index}`,
    qid: null,
    questionCategoryId: QuestionCategoryId.Gratitude,
    val: `answer ${index}`,
    ts: NOW,
  }));

describe("interaction context", () => {
  it("derives daily counters, freshness, alternatives, and budget state", () => {
    const syncData = createMockSyncData({
      answers: answers(3),
      moodCheckTS: NOW,
      energyLvlTS: NOW,
      alternativeWebsites: ["wikipedia.org", "example.com"],
      attempts: { [TODAY]: 4 },
      sunTaps: { [TODAY]: 2 },
      dailyBudget: {
        globalMinutes: 30,
        perSiteMinutes: {
          "reddit.com": 10,
        },
      },
      dailyUsage: {
        [TODAY]: {
          totalSeconds: 900,
          perSite: {
            "reddit.com": 300,
          },
        },
      },
    });

    const context = getInteractionContext({
      syncData,
      now: NOW,
      target: { kind: "host", id: "reddit.com" },
      platform: "web",
    });

    expect(context).toMatchObject({
      dateISO: TODAY,
      localHour: 10,
      answerCount: 3,
      hasFewAnswers: false,
      hasFreshMood: true,
      moodCheckAgeMs: 0,
      hasFreshEnergy: true,
      isEvening: false,
      alternativeCount: 2,
      hasAlternatives: true,
      todayOpeningAttempts: 4,
      todaySunTaps: 2,
      todayUsageSeconds: 900,
      targetUsageSeconds: 300,
      budget: {
        isActive: true,
        remainingSeconds: 300,
        totalBudgetSeconds: 600,
        usedSeconds: 300,
        isExhausted: false,
      },
    });
  });

  it("uses app alternatives for app targets", () => {
    const syncData = createMockSyncData({
      alternativeApps: ["com.example.reader"],
      alternativeWebsites: ["example.com"],
    });

    const context = getInteractionContext({
      syncData,
      now: NOW,
      target: { kind: "app", id: "com.social.app" },
      platform: "android",
    });

    expect(context.alternativeCount).toBe(1);
    expect(context.hasAlternatives).toBe(true);
  });

  it("uses app alternatives for targetless app platforms", () => {
    const syncData = createMockSyncData({
      alternativeApps: ["com.example.reader"],
      alternativeWebsites: ["example.com"],
    });

    const context = getInteractionContext({
      syncData,
      now: NOW,
      platform: "ios",
    });

    expect(context.alternativeCount).toBe(1);
    expect(context.hasAlternatives).toBe(true);
  });

  it("does not apply site budget state to app targets", () => {
    const syncData = createMockSyncData({
      dailyBudget: {
        globalMinutes: 5,
      },
      dailyUsage: {
        [TODAY]: {
          totalSeconds: 300,
          perSite: {},
        },
      },
    });

    const context = getInteractionContext({
      syncData,
      now: NOW,
      target: { kind: "app", id: "com.social.app" },
      platform: "android",
    });

    expect(context.budget).toEqual({
      isActive: false,
      remainingSeconds: 0,
      totalBudgetSeconds: 0,
      usedSeconds: 0,
      isExhausted: false,
    });
    expect(getFrictionLevel(context)).not.toBe("strong");
  });

  it("identifies expired timers for the current target and platform", () => {
    const syncData = createMockSyncData({
      activeTimer: {
        endTS: NOW - 1,
        durationS: 300,
        startedTS: NOW - 301000,
        target: { kind: "host", id: "reddit.com" },
        platform: "web",
        intent: { id: "check_one_thing" },
      },
    });

    const context = getInteractionContext({
      syncData,
      now: NOW,
      target: { kind: "host", id: "reddit.com" },
      platform: "web",
    });

    expect(context.hasActiveTimer).toBe(false);
    expect(context.hasExpiredTimerForTarget).toBe(true);
    expect(context.hasIntentOnExpiredTimerForTarget).toBe(true);
  });

  it("does not treat active or cross-platform timers as expired for the current target", () => {
    const activeTimerData = createMockSyncData({
      activeTimer: {
        endTS: NOW + 1,
        durationS: 300,
        startedTS: NOW - 299000,
        target: { kind: "host", id: "reddit.com" },
        platform: "web",
        intent: { id: "check_one_thing" },
      },
    });

    const activeContext = getInteractionContext({
      syncData: activeTimerData,
      now: NOW,
      target: { kind: "host", id: "reddit.com" },
      platform: "web",
    });

    expect(activeContext.hasActiveTimer).toBe(true);
    expect(activeContext.hasExpiredTimerForTarget).toBe(false);
    expect(activeContext.hasIntentOnExpiredTimerForTarget).toBe(false);

    const crossPlatformTimerData = createMockSyncData({
      activeTimer: {
        endTS: NOW - 1,
        durationS: 300,
        startedTS: NOW - 301000,
        target: { kind: "host", id: "reddit.com" },
        platform: "android",
        intent: { id: "check_one_thing" },
      },
    });

    const crossPlatformContext = getInteractionContext({
      syncData: crossPlatformTimerData,
      now: NOW,
      target: { kind: "host", id: "reddit.com" },
      platform: "web",
    });

    expect(crossPlatformContext.hasExpiredTimerForTarget).toBe(false);
    expect(crossPlatformContext.hasIntentOnExpiredTimerForTarget).toBe(false);
  });
});

describe("friction level", () => {
  it("returns strong when the daily budget is exhausted", () => {
    const context = getInteractionContext({
      syncData: createMockSyncData({
        answers: answers(3),
        moodCheckTS: NOW,
        energyLvlTS: NOW,
        dailyBudget: {
          globalMinutes: 5,
        },
        dailyUsage: {
          [TODAY]: {
            totalSeconds: 300,
            perSite: {},
          },
        },
      }),
      now: NOW,
      target: { kind: "host", id: "reddit.com" },
      platform: "web",
    });

    expect(getFrictionLevel(context)).toBe("strong");
  });

  it("returns strong after many continuations today", () => {
    const context = getInteractionContext({
      syncData: createMockSyncData({
        answers: answers(3),
        moodCheckTS: NOW,
        energyLvlTS: NOW,
        sunTaps: { [TODAY]: 5 },
      }),
      now: NOW,
      target: { kind: "host", id: "reddit.com" },
      platform: "web",
    });

    expect(getFrictionLevel(context)).toBe("strong");
  });

  it("keeps low-information situations at normal friction", () => {
    const context = getInteractionContext({
      syncData: createMockSyncData({
        answers: answers(1),
        moodCheckTS: NOW,
        energyLvlTS: NOW,
      }),
      now: NOW,
      target: { kind: "host", id: "reddit.com" },
      platform: "web",
    });

    expect(getFrictionLevel(context)).toBe("normal");
  });

  it("allows soft friction for fresh low-pressure context", () => {
    const context = getInteractionContext({
      syncData: createMockSyncData({
        answers: answers(3),
        moodCheckTS: NOW,
        energyLvlTS: NOW,
        attempts: { [TODAY]: 1 },
        sunTaps: { [TODAY]: 0 },
        dailyUsage: {
          [TODAY]: {
            totalSeconds: 60,
            perSite: {
              "reddit.com": 60,
            },
          },
        },
      }),
      now: NOW,
      target: { kind: "host", id: "reddit.com" },
      platform: "web",
    });

    expect(getFrictionLevel(context)).toBe("soft");
  });
});
