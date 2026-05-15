import { createMockSyncData, mockDate } from "@src/test-utils/mockHelpers";
import { isRestOfDayActive } from "../isRestOfDayActive";

describe("isRestOfDayActive", () => {
  const NOW = new Date("2026-05-15T10:00:00").getTime();

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("matches legacy rest-of-day timers without target scope", () => {
    mockDate(NOW);

    const syncData = createMockSyncData({
      activeTimer: {
        endTS: NOW + 60 * 60 * 1000,
        durationS: -1,
      },
    });

    expect(
      isRestOfDayActive(syncData, { kind: "host", id: "reddit.com" }, "web"),
    ).toBe(true);
  });

  it("matches rest-of-day timers for the current host and platform", () => {
    mockDate(NOW);

    const syncData = createMockSyncData({
      activeTimer: {
        endTS: NOW + 60 * 60 * 1000,
        durationS: -1,
        target: { kind: "host", id: "reddit.com" },
        platform: "web",
      },
    });

    expect(
      isRestOfDayActive(syncData, { kind: "host", id: "reddit.com" }, "web"),
    ).toBe(true);
  });

  it("does not match another host's rest-of-day timer", () => {
    mockDate(NOW);

    const syncData = createMockSyncData({
      activeTimer: {
        endTS: NOW + 60 * 60 * 1000,
        durationS: -1,
        target: { kind: "host", id: "youtube.com" },
        platform: "web",
      },
    });

    expect(
      isRestOfDayActive(syncData, { kind: "host", id: "reddit.com" }, "web"),
    ).toBe(false);
  });

  it("does not match another platform's rest-of-day timer", () => {
    mockDate(NOW);

    const syncData = createMockSyncData({
      activeTimer: {
        endTS: NOW + 60 * 60 * 1000,
        durationS: -1,
        target: { kind: "host", id: "reddit.com" },
        platform: "android",
      },
    });

    expect(
      isRestOfDayActive(syncData, { kind: "host", id: "reddit.com" }, "web"),
    ).toBe(false);
  });
});
