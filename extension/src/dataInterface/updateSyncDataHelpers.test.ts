import type { SyncData } from "@src/dataInterface/syncData";
import { addBudgetUsage } from "@src/util/budget";
import { createMockSyncData, mockDate } from "@src/test-utils/mockHelpers";
import { updateSyncDataField } from "./updateSyncDataHelpers";

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
      addBudgetUsage(syncData, "reddit.com", 10),
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
