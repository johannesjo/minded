import { getFrictionLevel, getInteractionContext } from "../interactionContext";
import { createMockSyncData } from "@src/test-utils/mockHelpers";
import { QuestionCategoryId } from "@src/shared/data/questions";
import type { Answer } from "@src/dataInterface/syncData";

const NOW = new Date("2026-05-11T10:00:00").getTime();
const TODAY = "2026-05-11";
const ONE_HOUR = 60 * 60 * 1000;

const answers = (count: number): Answer[] =>
  Array.from({ length: count }, (_, index) => ({
    id: `${index}`,
    qid: null,
    questionCategoryId: QuestionCategoryId.Gratitude,
    val: `answer ${index}`,
    ts: NOW,
  }));

describe("interaction context", () => {
  it("derives daily counters, freshness, and alternatives", () => {
    const syncData = createMockSyncData({
      answers: answers(3),
      moodCheckTS: NOW,
      energyLvlTS: NOW,
      alternativeWebsites: ["wikipedia.org", "example.com"],
      attempts: { [TODAY]: 4 },
      sunTaps: { [TODAY]: 2 },
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
      hasFreshEnergy: true,
      isEvening: false,
      alternativeCount: 2,
      hasAlternatives: true,
      todayOpeningAttempts: 4,
      todaySunTaps: 2,
      recentSunTaps: 0,
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

  it("counts only enabled structured alternatives", () => {
    const syncData = createMockSyncData({
      alternatives: [
        {
          id: "enabled",
          kind: "website",
          label: "Enabled",
          url: "https://enabled.example",
          createdTS: NOW,
          shownCount: 0,
          dismissedCount: 0,
          openedCount: 0,
        },
        {
          id: "disabled",
          kind: "website",
          label: "Disabled",
          url: "https://disabled.example",
          createdTS: NOW,
          shownCount: 0,
          dismissedCount: 0,
          openedCount: 0,
          disabledTS: NOW,
        },
      ],
    });

    const context = getInteractionContext({
      syncData,
      now: NOW,
      target: { kind: "host", id: "reddit.com" },
      platform: "web",
    });

    expect(context.alternativeCount).toBe(1);
    expect(context.hasAlternatives).toBe(true);
  });

  it("does not count legacy alternatives after their structured copy is disabled", () => {
    const syncData = createMockSyncData({
      alternatives: [
        {
          id: "legacy-web:https://example.com",
          kind: "website",
          label: "example.com",
          url: "https://example.com",
          createdTS: 0,
          shownCount: 1,
          dismissedCount: 3,
          openedCount: 0,
          disabledTS: NOW,
        },
      ],
      alternativeWebsites: ["https://example.com"],
    });

    const context = getInteractionContext({
      syncData,
      now: NOW,
      target: { kind: "host", id: "reddit.com" },
      platform: "web",
    });

    expect(context.alternativeCount).toBe(0);
    expect(context.hasAlternatives).toBe(false);
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

  it("does not treat another host's active timer as active for the current target", () => {
    const syncData = createMockSyncData({
      activeTimer: {
        endTS: NOW + 300000,
        durationS: 300,
        startedTS: NOW,
        target: { kind: "host", id: "youtube.com" },
        platform: "web",
      },
    });

    const context = getInteractionContext({
      syncData,
      now: NOW,
      target: { kind: "host", id: "reddit.com" },
      platform: "web",
    });

    expect(context.hasActiveTimer).toBe(false);
    expect(context.hasExpiredTimerForTarget).toBe(false);
  });
});

describe("friction level", () => {
  it("returns strong after many continuations in the last five hours", () => {
    const context = getInteractionContext({
      syncData: createMockSyncData({
        answers: answers(3),
        moodCheckTS: NOW,
        energyLvlTS: NOW,
        sunTaps: { [TODAY]: 5 },
        sunTapTimestamps: [
          NOW - 4 * ONE_HOUR,
          NOW - 3 * ONE_HOUR,
          NOW - 2 * ONE_HOUR,
          NOW - ONE_HOUR,
          NOW,
        ],
      }),
      now: NOW,
      target: { kind: "host", id: "reddit.com" },
      platform: "web",
    });

    expect(getFrictionLevel(context)).toBe("strong");
  });

  it("does not return strong when today's continuations are outside the five-hour window", () => {
    const context = getInteractionContext({
      syncData: createMockSyncData({
        answers: answers(3),
        moodCheckTS: NOW,
        energyLvlTS: NOW,
        sunTaps: { [TODAY]: 5 },
        sunTapTimestamps: [
          NOW - 9 * ONE_HOUR,
          NOW - 8 * ONE_HOUR,
          NOW - 7 * ONE_HOUR,
          NOW - 6 * ONE_HOUR,
          NOW - 5 * ONE_HOUR - 1,
        ],
      }),
      now: NOW,
      target: { kind: "host", id: "reddit.com" },
      platform: "web",
    });

    expect(context.recentSunTaps).toBe(0);
    expect(getFrictionLevel(context)).toBe("normal");
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

  describe("bedtime window", () => {
    const NIGHT_RANGE = { start: "22:00", end: "07:00" };
    const bedtimeCfg = {
      enabled: true,
      days: {
        0: NIGHT_RANGE,
        1: NIGHT_RANGE,
        2: NIGHT_RANGE,
        3: NIGHT_RANGE,
        4: NIGHT_RANGE,
        5: NIGHT_RANGE,
        6: NIGHT_RANGE,
      },
    };
    const contextAt = (isoWithTime: string, cfg = bedtimeCfg) =>
      getInteractionContext({
        syncData: createMockSyncData({ cfg: { sleepWindDown: cfg } }),
        now: new Date(isoWithTime).getTime(),
        target: { kind: "host", id: "reddit.com" },
        platform: "web",
      });

    it("resolves the night id inside the configured window", () => {
      const context = contextAt("2026-05-11T23:00:00");
      expect(context.bedtimeNightId).toBe("2026-05-11");
      expect(context.isBedtimeWindow).toBe(true);
    });

    it("is null outside the window", () => {
      const context = contextAt("2026-05-11T10:00:00");
      expect(context.bedtimeNightId).toBeNull();
      expect(context.isBedtimeWindow).toBe(false);
    });

    it("is null when there is no bedtime config at all", () => {
      const context = getInteractionContext({
        syncData: createMockSyncData({}),
        now: new Date("2026-05-11T23:00:00").getTime(),
        target: { kind: "host", id: "reddit.com" },
        platform: "web",
      });
      expect(context.bedtimeNightId).toBeNull();
      expect(context.isBedtimeWindow).toBe(false);
    });
  });
});
