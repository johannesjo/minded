import { isOnBlockedUrl } from "../isOnBlockedUrl";
import { createMockSyncData } from "@src/test-utils/mockHelpers";

// Mock isWithinFocusHours to control focus hours behavior
jest.mock("../isWithinFocusHours", () => ({
  isWithinFocusHours: jest.fn(() => true),
}));

import { isWithinFocusHours } from "../isWithinFocusHours";

const mockedIsWithinFocusHours = isWithinFocusHours as jest.Mock;

describe("isOnBlockedUrl", () => {
  beforeEach(() => {
    mockedIsWithinFocusHours.mockReturnValue(true);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("exact host matching", () => {
    it("returns true for exact match", () => {
      const syncData = createMockSyncData({
        cfg: {
          isOnboardingComplete: true,
          blockedHosts: ["reddit.com"],
          blockedApps: [],
        },
      });
      expect(isOnBlockedUrl("https://reddit.com/r/all", syncData)).toBe(true);
    });

    it("returns false for non-matching host", () => {
      const syncData = createMockSyncData({
        cfg: {
          isOnboardingComplete: true,
          blockedHosts: ["reddit.com"],
          blockedApps: [],
        },
      });
      expect(isOnBlockedUrl("https://google.com", syncData)).toBe(false);
    });
  });

  describe("subdomain matching", () => {
    it("matches subdomain against base domain", () => {
      const syncData = createMockSyncData({
        cfg: {
          isOnboardingComplete: true,
          blockedHosts: ["tagesschau.de"],
          blockedApps: [],
        },
      });
      expect(isOnBlockedUrl("https://sport.tagesschau.de/news", syncData)).toBe(
        true,
      );
    });

    it("matches deep subdomain", () => {
      const syncData = createMockSyncData({
        cfg: {
          isOnboardingComplete: true,
          blockedHosts: ["youtube.com"],
          blockedApps: [],
        },
      });
      expect(isOnBlockedUrl("https://music.youtube.com", syncData)).toBe(true);
    });

    it("does not match partial domain names", () => {
      const syncData = createMockSyncData({
        cfg: {
          isOnboardingComplete: true,
          blockedHosts: ["schau.de"],
          blockedApps: [],
        },
      });
      expect(isOnBlockedUrl("https://tagesschau.de", syncData)).toBe(false);
    });

    it("does not match when blocked host is suffix without dot", () => {
      const syncData = createMockSyncData({
        cfg: {
          isOnboardingComplete: true,
          blockedHosts: ["it.com"],
          blockedApps: [],
        },
      });
      expect(isOnBlockedUrl("https://reddit.com", syncData)).toBe(false);
    });
  });

  describe("www prefix handling", () => {
    it("matches www. prefixed URL against non-www blocked host", () => {
      const syncData = createMockSyncData({
        cfg: {
          isOnboardingComplete: true,
          blockedHosts: ["facebook.com"],
          blockedApps: [],
        },
      });
      expect(isOnBlockedUrl("https://www.facebook.com", syncData)).toBe(true);
    });

    it("matches non-www URL against blocked host", () => {
      const syncData = createMockSyncData({
        cfg: {
          isOnboardingComplete: true,
          blockedHosts: ["facebook.com"],
          blockedApps: [],
        },
      });
      expect(isOnBlockedUrl("https://facebook.com", syncData)).toBe(true);
    });
  });

  describe("focus hours integration", () => {
    it("returns false when outside focus hours", () => {
      mockedIsWithinFocusHours.mockReturnValue(false);
      const syncData = createMockSyncData({
        cfg: {
          isOnboardingComplete: true,
          blockedHosts: ["reddit.com"],
          blockedApps: [],
        },
      });
      expect(isOnBlockedUrl("https://reddit.com", syncData)).toBe(false);
    });

    it("returns true when within focus hours and host is blocked", () => {
      mockedIsWithinFocusHours.mockReturnValue(true);
      const syncData = createMockSyncData({
        cfg: {
          isOnboardingComplete: true,
          blockedHosts: ["reddit.com"],
          blockedApps: [],
        },
      });
      expect(isOnBlockedUrl("https://reddit.com", syncData)).toBe(true);
    });
  });

  describe("empty blocked list", () => {
    it("returns false when no hosts are blocked", () => {
      const syncData = createMockSyncData({
        cfg: { isOnboardingComplete: true, blockedHosts: [], blockedApps: [] },
      });
      expect(isOnBlockedUrl("https://reddit.com", syncData)).toBe(false);
    });
  });

  describe("multiple blocked hosts", () => {
    it("matches any of multiple blocked hosts", () => {
      const syncData = createMockSyncData({
        cfg: {
          isOnboardingComplete: true,
          blockedHosts: ["reddit.com", "facebook.com", "youtube.com"],
          blockedApps: [],
        },
      });
      expect(isOnBlockedUrl("https://youtube.com", syncData)).toBe(true);
      expect(isOnBlockedUrl("https://facebook.com/feed", syncData)).toBe(true);
      expect(isOnBlockedUrl("https://twitter.com", syncData)).toBe(false);
    });
  });

  describe("edge cases", () => {
    it("handles URL with port", () => {
      const syncData = createMockSyncData({
        cfg: {
          isOnboardingComplete: true,
          blockedHosts: ["localhost"],
          blockedApps: [],
        },
      });
      expect(isOnBlockedUrl("http://localhost:3000", syncData)).toBe(true);
    });

    it("handles URL with path and query params", () => {
      const syncData = createMockSyncData({
        cfg: {
          isOnboardingComplete: true,
          blockedHosts: ["reddit.com"],
          blockedApps: [],
        },
      });
      expect(
        isOnBlockedUrl(
          "https://reddit.com/r/programming?sort=top&t=week",
          syncData,
        ),
      ).toBe(true);
    });
  });
});
