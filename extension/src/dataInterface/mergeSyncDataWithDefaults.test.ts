import { DEFAULT_SYNC_DATA } from "@src/dataInterface/syncData.const";
import { mergeSyncDataWithDefaults } from "@src/dataInterface/mergeSyncDataWithDefaults";
import type { SyncData } from "@src/dataInterface/syncData";

jest.mock("@src/dataInterface/commonSyncDataInterface", () => ({
  IS_ANDROID: false,
  IS_APP: false,
  IS_IOS: false,
  IS_WEB_EXT: true,
}));

describe("mergeSyncDataWithDefaults", () => {
  it("adds pattern insight state for old sync data", () => {
    const { patternInsightState: _patternInsightState, ...oldSyncData } =
      DEFAULT_SYNC_DATA;

    expect(
      mergeSyncDataWithDefaults(oldSyncData as Partial<SyncData>)
        .patternInsightState,
    ).toEqual({
      shownInsightIdsByDate: {},
    });
  });
});
