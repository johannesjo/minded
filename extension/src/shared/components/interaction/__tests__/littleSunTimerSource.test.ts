import { createMockSyncData } from "@src/test-utils/mockHelpers";
import { SessionGraceCfg, SyncData } from "@src/dataInterface/syncData";
import { getLittleSunTimerSource } from "../littleSunTimerSource";

const withGrace = (grace: SessionGraceCfg): SyncData => {
  const data = createMockSyncData();
  return {
    ...data,
    cfg: { ...data.cfg, sessionGrace: grace },
  };
};

describe("getLittleSunTimerSource", () => {
  const HOST = "reddit.com";
  const NOW = new Date("2026-05-15T10:00:00").getTime();

  it("returns grace when grace is active", () => {
    const syncData = withGrace({ enabled: true, minutes: 5 });
    const source = getLittleSunTimerSource(syncData, HOST, 0, NOW);
    expect(source).toEqual({ type: "grace", remainingSeconds: 5 * 60 });
  });

  it("returns grace-exhausted when grace is configured but used up and no budget", () => {
    const syncData = withGrace({ enabled: true, minutes: 5 });
    const source = getLittleSunTimerSource(syncData, HOST, 5 * 60, NOW);
    expect(source).toEqual({ type: "grace-exhausted" });
  });

  it("returns budget when grace is exhausted but budget has time left", () => {
    const base = withGrace({ enabled: true, minutes: 5 });
    const syncData: SyncData = {
      ...base,
      dailyBudget: { globalMinutes: 30 },
      dailyUsage: {},
    };
    const source = getLittleSunTimerSource(syncData, HOST, 5 * 60, NOW);
    expect(source.type).toBe("budget");
  });

  it("returns elapsed (not grace-exhausted) when grace is disabled", () => {
    const syncData = createMockSyncData();
    const source = getLittleSunTimerSource(syncData, HOST, 600, NOW);
    expect(source.type).toBe("elapsed");
  });
});
