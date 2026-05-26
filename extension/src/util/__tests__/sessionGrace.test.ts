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
});
