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

  it("shows the full minder when pending live budget usage exhausts the budget", () => {
    mockDate(NOW);

    const syncData = createMockSyncData({
      dailyBudget: { globalMinutes: 10 },
      dailyUsage: {
        "2026-05-15": {
          totalSeconds: 9 * 60 + 55,
          perSite: { "reddit.com": 9 * 60 + 55 },
        },
      },
    });

    expect(isShowFullMinder("https://www.reddit.com/r/test", syncData, 6)).toBe(
      true,
    );
  });
});
