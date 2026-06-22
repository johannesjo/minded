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
});
