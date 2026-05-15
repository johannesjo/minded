import { createMockSyncData, mockDate } from "@src/test-utils/mockHelpers";
import { getIsoDate } from "@src/util/getIsoDate";
import { getLittleSunTimerSource } from "./littleSunTimerSource";

describe("getLittleSunTimerSource", () => {
  const NOW = new Date("2026-05-15T10:00:00").getTime();
  const TODAY = getIsoDate(new Date(NOW));

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("prefers a scoped active session over daily budget", () => {
    mockDate(NOW);

    const syncData = createMockSyncData({
      activeTimer: {
        endTS: NOW + 2 * 60 * 1000,
        durationS: 2 * 60,
        startedTS: NOW,
        target: { kind: "host", id: "reddit.com" },
        platform: "web",
      },
      dailyBudget: { globalMinutes: 30 },
      dailyUsage: {
        [TODAY]: {
          totalSeconds: 10 * 60,
          perSite: { "reddit.com": 10 * 60 },
        },
      },
    });

    expect(
      getLittleSunTimerSource(syncData, "reddit.com", 0, NOW),
    ).toMatchObject({
      type: "session",
      activeTimer: {
        durationS: 2 * 60,
        target: { kind: "host", id: "reddit.com" },
        platform: "web",
      },
    });
  });

  it("uses budget when the active timer belongs to another host", () => {
    mockDate(NOW);

    const syncData = createMockSyncData({
      activeTimer: {
        endTS: NOW + 2 * 60 * 1000,
        durationS: 2 * 60,
        startedTS: NOW,
        target: { kind: "host", id: "youtube.com" },
        platform: "web",
      },
      dailyBudget: { globalMinutes: 30 },
      dailyUsage: {
        [TODAY]: {
          totalSeconds: 10 * 60,
          perSite: { "reddit.com": 10 * 60 },
        },
      },
    });

    expect(getLittleSunTimerSource(syncData, "reddit.com", 0, NOW)).toEqual({
      type: "budget",
      remainingSeconds: 20 * 60,
    });
  });

  it("subtracts pending live budget usage before it is written to sync storage", () => {
    mockDate(NOW);

    const syncData = createMockSyncData({
      dailyBudget: { globalMinutes: 30 },
      dailyUsage: {
        [TODAY]: {
          totalSeconds: 10 * 60,
          perSite: { "reddit.com": 10 * 60 },
        },
      },
    });

    expect(getLittleSunTimerSource(syncData, "reddit.com", 0, NOW, 12)).toEqual(
      {
        type: "budget",
        remainingSeconds: 20 * 60 - 12,
      },
    );
  });

  it("marks an expired scoped timer for cleanup when falling back to elapsed time", () => {
    mockDate(NOW);

    const syncData = createMockSyncData({
      activeTimer: {
        endTS: NOW - 1,
        durationS: 2 * 60,
        startedTS: NOW - 2 * 60 * 1000,
        target: { kind: "host", id: "reddit.com" },
        platform: "web",
      },
    });

    expect(getLittleSunTimerSource(syncData, "reddit.com", 42, NOW)).toEqual({
      type: "elapsed",
      initialSeconds: 42,
      shouldClearExpiredTimer: true,
    });
  });

  it("returns budget-exhausted when budget is active with no remaining time", () => {
    mockDate(NOW);

    const syncData = createMockSyncData({
      dailyBudget: { globalMinutes: 10 },
      dailyUsage: {
        [TODAY]: {
          totalSeconds: 10 * 60,
          perSite: { "reddit.com": 10 * 60 },
        },
      },
    });

    expect(getLittleSunTimerSource(syncData, "reddit.com", 42, NOW)).toEqual({
      type: "budget-exhausted",
    });
  });

  it("does not clean up expired timers for another host", () => {
    mockDate(NOW);

    const syncData = createMockSyncData({
      activeTimer: {
        endTS: NOW - 1,
        durationS: 2 * 60,
        startedTS: NOW - 2 * 60 * 1000,
        target: { kind: "host", id: "youtube.com" },
        platform: "web",
      },
    });

    expect(getLittleSunTimerSource(syncData, "reddit.com", 42, NOW)).toEqual({
      type: "elapsed",
      initialSeconds: 42,
      shouldClearExpiredTimer: false,
    });
  });
});
