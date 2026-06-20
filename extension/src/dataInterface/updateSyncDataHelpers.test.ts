import type { SyncData } from "@src/dataInterface/syncData";
import { createMockSyncData, mockDate } from "@src/test-utils/mockHelpers";
import { updateSyncDataField } from "./updateSyncDataHelpers";

// A representative same-field updater: merges added seconds onto whatever
// dailyUsage already exists, so the test can verify updateSyncDataField rebases
// onto writes made after its initial read.
const addUsage = (
  syncData: SyncData,
  host: string,
  seconds: number,
  dateISO: string,
): Pick<SyncData, "dailyUsage"> => {
  const current = syncData.dailyUsage[dateISO] ?? {
    totalSeconds: 0,
    perSite: {},
  };
  return {
    dailyUsage: {
      ...syncData.dailyUsage,
      [dateISO]: {
        totalSeconds: current.totalSeconds + seconds,
        perSite: {
          ...current.perSite,
          [host]: (current.perSite[host] ?? 0) + seconds,
        },
      },
    },
  };
};

describe("updateSyncDataField", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("patches only changed top-level fields", async () => {
    const staleSyncData = createMockSyncData({
      attempts: {},
      dailyBudget: null,
    });
    const latestSyncData = createMockSyncData({
      attempts: {},
      dailyBudget: { globalMinutes: 30 },
    });
    const getSyncData = jest
      .fn<Promise<SyncData>, []>()
      .mockResolvedValueOnce(staleSyncData)
      .mockResolvedValueOnce(latestSyncData);
    const patchSyncData = jest
      .fn<Promise<void>, [Partial<SyncData>]>()
      .mockResolvedValue();

    await updateSyncDataField(getSyncData, patchSyncData, (syncData) => ({
      attempts: {
        ...syncData.attempts,
        "2026-05-18": 1,
      },
    }));

    expect(patchSyncData).toHaveBeenCalledWith({
      attempts: { "2026-05-18": 1 },
    });
  });

  it("rebases same-field updates onto writes made after the initial read", async () => {
    mockDate("2026-05-18T10:00:00");

    const staleSyncData = createMockSyncData({
      dailyUsage: {},
    });
    const latestSyncData = createMockSyncData({
      dailyUsage: {
        "2026-05-18": {
          totalSeconds: 10,
          perSite: { "reddit.com": 10 },
        },
      },
    });
    const getSyncData = jest
      .fn<Promise<SyncData>, []>()
      .mockResolvedValueOnce(staleSyncData)
      .mockResolvedValueOnce(latestSyncData);
    const patchSyncData = jest
      .fn<Promise<void>, [Partial<SyncData>]>()
      .mockResolvedValue();

    await updateSyncDataField(getSyncData, patchSyncData, (syncData) =>
      addUsage(syncData, "reddit.com", 10, "2026-05-18"),
    );

    expect(patchSyncData).toHaveBeenCalledWith({
      dailyUsage: {
        "2026-05-18": {
          totalSeconds: 20,
          perSite: { "reddit.com": 20 },
        },
      },
    });
  });
});
