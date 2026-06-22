import type { SyncData } from "@src/dataInterface/syncData";
import { createMockSyncData } from "@src/test-utils/mockHelpers";
import { updateSyncDataField } from "./updateSyncDataHelpers";
import { addUsageTime } from "@src/shared/components/interaction/appUsageOrBrowsingBehavior/usageStats";

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
    const now = new Date("2026-05-18T10:00:00").getTime();

    // Stale read has no usage yet; a concurrent write lands 10s before our patch.
    // `addUsageTime` is the real live same-field updater (usageStats).
    const staleSyncData = createMockSyncData({ usageStats: {} });
    const latestSyncData = createMockSyncData({
      usageStats: addUsageTime({}, "reddit.com", 10, now),
    });
    const getSyncData = jest
      .fn<Promise<SyncData>, []>()
      .mockResolvedValueOnce(staleSyncData)
      .mockResolvedValueOnce(latestSyncData);
    const patchSyncData = jest
      .fn<Promise<void>, [Partial<SyncData>]>()
      .mockResolvedValue();

    await updateSyncDataField(getSyncData, patchSyncData, (syncData) => ({
      usageStats: addUsageTime(syncData.usageStats, "reddit.com", 10, now),
    }));

    // Our 10s rebases onto the concurrent write instead of clobbering it → 20s.
    expect(patchSyncData).toHaveBeenCalledWith({
      usageStats: addUsageTime(
        addUsageTime({}, "reddit.com", 10, now),
        "reddit.com",
        10,
        now,
      ),
    });
  });
});
