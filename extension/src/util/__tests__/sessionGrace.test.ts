import { createMockSyncData } from "@src/test-utils/mockHelpers";
import { SessionGraceCfg, SyncData } from "@src/dataInterface/syncData";
import {
  getSessionGraceRemainingS,
  isSessionGraceActive,
} from "../sessionGrace";

const withGrace = (grace: SessionGraceCfg): SyncData => {
  const data = createMockSyncData();
  return {
    ...data,
    cfg: { ...data.cfg, sessionGrace: grace },
  };
};

describe("sessionGrace", () => {
  describe("getSessionGraceRemainingS", () => {
    it("returns 0 when grace is not configured", () => {
      const syncData = createMockSyncData();
      expect(getSessionGraceRemainingS(syncData, 0)).toBe(0);
    });

    it("returns 0 when grace is configured but disabled", () => {
      const syncData = withGrace({ enabled: false, minutes: 5 });
      expect(getSessionGraceRemainingS(syncData, 0)).toBe(0);
    });

    it("returns 0 when grace minutes is 0", () => {
      const syncData = withGrace({ enabled: true, minutes: 0 });
      expect(getSessionGraceRemainingS(syncData, 0)).toBe(0);
    });

    it("returns full grace window for a fresh session", () => {
      const syncData = withGrace({ enabled: true, minutes: 5 });
      expect(getSessionGraceRemainingS(syncData, 0)).toBe(5 * 60);
    });

    it("returns the remaining grace seconds when partway through", () => {
      const syncData = withGrace({ enabled: true, minutes: 5 });
      expect(getSessionGraceRemainingS(syncData, 120)).toBe(5 * 60 - 120);
    });

    it("returns 0 when session duration meets or exceeds grace", () => {
      const syncData = withGrace({ enabled: true, minutes: 5 });
      expect(getSessionGraceRemainingS(syncData, 5 * 60)).toBe(0);
      expect(getSessionGraceRemainingS(syncData, 10 * 60)).toBe(0);
    });

    it("treats negative session duration as 0", () => {
      const syncData = withGrace({ enabled: true, minutes: 5 });
      expect(getSessionGraceRemainingS(syncData, -10)).toBe(5 * 60);
    });
  });

  describe("isSessionGraceActive", () => {
    it("is true when grace remains", () => {
      const syncData = withGrace({ enabled: true, minutes: 1 });
      expect(isSessionGraceActive(syncData, 30)).toBe(true);
    });

    it("is false when grace is exhausted", () => {
      const syncData = withGrace({ enabled: true, minutes: 1 });
      expect(isSessionGraceActive(syncData, 60)).toBe(false);
    });

    it("is false when grace is disabled", () => {
      const syncData = createMockSyncData();
      expect(isSessionGraceActive(syncData, 0)).toBe(false);
    });
  });

  describe("a 'later' week from the skip check-in", () => {
    const NOW = new Date("2026-05-11T10:00:00").getTime();
    const WEEK = 7 * 24 * 60 * 60 * 1000;
    const laterWeek = (data: SyncData, untilTS = NOW + WEEK): SyncData => ({
      ...data,
      interventionPause: { kind: "later", untilTS },
    });

    it("holds the pause back for the first ten minutes of a session", () => {
      const syncData = laterWeek(createMockSyncData());
      expect(getSessionGraceRemainingS(syncData, 0, NOW)).toBe(10 * 60);
      expect(getSessionGraceRemainingS(syncData, 9 * 60, NOW)).toBe(60);
      expect(getSessionGraceRemainingS(syncData, 10 * 60, NOW)).toBe(0);
    });

    it("widens a shorter grace the user set", () => {
      const syncData = laterWeek(withGrace({ enabled: true, minutes: 5 }));
      expect(getSessionGraceRemainingS(syncData, 0, NOW)).toBe(10 * 60);
    });

    it("keeps a longer grace the user set", () => {
      const syncData = laterWeek(withGrace({ enabled: true, minutes: 30 }));
      expect(getSessionGraceRemainingS(syncData, 0, NOW)).toBe(30 * 60);
    });

    it("ends with the week", () => {
      const syncData = laterWeek(createMockSyncData(), NOW - 1);
      expect(getSessionGraceRemainingS(syncData, 0, NOW)).toBe(0);
    });

    it("is not a grace at all for a week off", () => {
      const syncData: SyncData = {
        ...createMockSyncData(),
        interventionPause: { kind: "off", untilTS: NOW + WEEK },
      };
      expect(getSessionGraceRemainingS(syncData, 0, NOW)).toBe(0);
    });
  });
});
