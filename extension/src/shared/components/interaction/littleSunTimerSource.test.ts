import { createMockSyncData, mockDate } from "@src/test-utils/mockHelpers";
import { getLittleSunTimerSource } from "./littleSunTimerSource";

describe("getLittleSunTimerSource", () => {
  const NOW = new Date("2026-05-15T10:00:00").getTime();

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("prefers a scoped active session over elapsed time", () => {
    mockDate(NOW);

    const syncData = createMockSyncData({
      activeTimer: {
        endTS: NOW + 2 * 60 * 1000,
        durationS: 2 * 60,
        startedTS: NOW,
        target: { kind: "host", id: "reddit.com" },
        platform: "web",
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

  it("returns grace while the per-session grace window has time left", () => {
    mockDate(NOW);

    const syncData = createMockSyncData({
      cfg: { sessionGrace: { enabled: true, minutes: 5 } },
    });

    expect(getLittleSunTimerSource(syncData, "reddit.com", 60, NOW)).toEqual({
      type: "grace",
      remainingSeconds: 5 * 60 - 60,
    });
  });

  it("returns grace-exhausted when a configured grace window has run out", () => {
    mockDate(NOW);

    const syncData = createMockSyncData({
      cfg: { sessionGrace: { enabled: true, minutes: 5 } },
    });

    expect(
      getLittleSunTimerSource(syncData, "reddit.com", 5 * 60, NOW),
    ).toEqual({ type: "grace-exhausted" });
  });

  it("falls back to elapsed time when no session or grace applies", () => {
    mockDate(NOW);

    const syncData = createMockSyncData();

    expect(getLittleSunTimerSource(syncData, "reddit.com", 42, NOW)).toEqual({
      type: "elapsed",
      initialSeconds: 42,
      shouldClearExpiredTimer: false,
    });
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
