jest.mock("@dataInterface/syncDataInterface", () => ({
  getSyncDataN: jest.fn(),
  saveAnswerN: jest.fn(),
  saveSyncDataN: jest.fn(),
}));

jest.mock("@dataInterface/system", () => ({
  IS_ANDROID: false,
  IS_APP: false,
  IS_IOS: false,
  IS_WEB_EXT: true,
  requestFocusAndShowKeyboard: jest.fn(),
}));

import { countSunTap } from "@src/dataInterface/commonSyncDataInterface";
import { getSyncDataN, saveSyncDataN } from "@dataInterface/syncDataInterface";
import { createMockSyncData } from "@src/test-utils/mockHelpers";

const mockedGetSyncData = getSyncDataN as jest.MockedFunction<
  typeof getSyncDataN
>;
const mockedSaveSyncData = saveSyncDataN as jest.MockedFunction<
  typeof saveSyncDataN
>;

describe("commonSyncDataInterface", () => {
  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  describe("countSunTap", () => {
    it("increments the daily counter and stores a pruned recent timestamp history", async () => {
      const now = new Date("2026-05-11T10:00:00").getTime();
      const oneHour = 60 * 60 * 1000;
      jest.spyOn(Date, "now").mockReturnValue(now);
      mockedGetSyncData.mockResolvedValue(
        createMockSyncData({
          sunTaps: {
            "2026-05-10": 9,
            "2026-05-11": 2,
          },
          sunTapTimestamps: [
            now - 6 * oneHour,
            now - 5 * oneHour,
            now - oneHour,
            now + 1,
          ],
        }),
      );
      mockedSaveSyncData.mockResolvedValue();

      await countSunTap();

      expect(mockedSaveSyncData).toHaveBeenCalledWith(
        expect.objectContaining({
          sunTaps: {
            "2026-05-10": 9,
            "2026-05-11": 3,
          },
          sunTapTimestamps: [now - 5 * oneHour, now - oneHour, now],
        }),
      );
    });

    it("handles stored data without timestamp history", async () => {
      const now = new Date("2026-05-11T10:00:00").getTime();
      jest.spyOn(Date, "now").mockReturnValue(now);
      mockedGetSyncData.mockResolvedValue(
        createMockSyncData({
          sunTaps: {},
          sunTapTimestamps: undefined,
        }),
      );
      mockedSaveSyncData.mockResolvedValue();

      await countSunTap();

      expect(mockedSaveSyncData).toHaveBeenCalledWith(
        expect.objectContaining({
          sunTaps: {
            "2026-05-11": 1,
          },
          sunTapTimestamps: [now],
        }),
      );
    });
  });
});
