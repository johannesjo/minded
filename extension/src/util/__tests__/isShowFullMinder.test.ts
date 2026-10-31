import { createMockSyncData, mockDate } from "@src/test-utils/mockHelpers";

jest.mock("../getHostFromUrl", () => ({
  getHostFromUrl: jest.fn((url: string) =>
    url.includes("reddit.com") ? "reddit.com" : "youtube.com",
  ),
}));

import { isShowFullMinder } from "../isShowFullMinder";

describe("isShowFullMinder", () => {
  const NOW = new Date("2026-05-15T10:00:00").getTime();

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("hides the full minder for an active timer scoped to the current host", () => {
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

    expect(isShowFullMinder("https://www.reddit.com/r/test", syncData)).toBe(
      false,
    );
  });

  it("does not hide the full minder for another host's active timer", () => {
    mockDate(NOW);

    const syncData = createMockSyncData({
      activeTimer: {
        endTS: NOW + 2 * 60 * 1000,
        durationS: 2 * 60,
        startedTS: NOW,
        target: { kind: "host", id: "youtube.com" },
        platform: "web",
      },
    });

    expect(isShowFullMinder("https://www.reddit.com/r/test", syncData)).toBe(
      true,
    );
  });

  it("hides the full minder while the per-session grace window has time left", () => {
    mockDate(NOW);

    const syncData = createMockSyncData({
      cfg: { sessionGrace: { enabled: true, minutes: 5 } },
    });

    expect(
      isShowFullMinder("https://www.reddit.com/r/test", syncData, 60),
    ).toBe(false);
  });

  it("shows the full minder once the grace window is exhausted", () => {
    mockDate(NOW);

    const syncData = createMockSyncData({
      cfg: { sessionGrace: { enabled: true, minutes: 5 } },
    });

    expect(
      isShowFullMinder("https://www.reddit.com/r/test", syncData, 5 * 60),
    ).toBe(true);
  });

  describe("a chosen time that ran out while waiting for a natural break", () => {
    const withGrace = createMockSyncData({
      cfg: { sessionGrace: { enabled: true, minutes: 10 } },
    });

    it("meets the next page load with the pause, not a fresh grace", () => {
      mockDate(NOW);

      expect(
        isShowFullMinder("https://www.reddit.com/r/test", withGrace, 0, {
          lastUsedTS: NOW - 1000,
          pauseDueTS: NOW - 60 * 1000,
        }),
      ).toBe(true);
    });

    it("leaves a visit with nothing due to the grace", () => {
      mockDate(NOW);

      expect(
        isShowFullMinder("https://www.reddit.com/r/test", withGrace, 0, {
          lastUsedTS: NOW - 1000,
          pauseDueTS: 0,
        }),
      ).toBe(false);
      expect(
        isShowFullMinder("https://www.reddit.com/r/test", withGrace, 0, {
          lastUsedTS: NOW - 1000,
        }),
      ).toBe(false);
    });

    it("forgets a marker whose session is long gone", () => {
      mockDate(NOW + 2 * 60 * 60 * 1000);

      expect(
        isShowFullMinder("https://www.reddit.com/r/test", withGrace, 0, {
          lastUsedTS: NOW - 1000,
          pauseDueTS: NOW - 60 * 1000,
        }),
      ).toBe(false);
    });

    it("never infers it from an expired timer still in storage", () => {
      mockDate(NOW);
      const lingering = createMockSyncData({
        activeTimer: {
          endTS: NOW - 60 * 60 * 1000,
          durationS: 5 * 60,
          startedTS: NOW - 65 * 60 * 1000,
          target: { kind: "host", id: "reddit.com" },
          platform: "web",
        },
        cfg: { sessionGrace: { enabled: true, minutes: 10 } },
      });

      expect(
        isShowFullMinder("https://www.reddit.com/r/test", lingering, 60, {
          lastUsedTS: NOW - 1000,
        }),
      ).toBe(false);
    });
  });
});
