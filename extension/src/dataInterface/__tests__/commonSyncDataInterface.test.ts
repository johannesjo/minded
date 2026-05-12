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

import {
  countSunTap,
  markAlternativeDismissed,
  markAlternativeOpenedAndCountSunTap,
} from "@src/dataInterface/commonSyncDataInterface";
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

  describe("markAlternativeOpenedAndCountSunTap", () => {
    it("records opened alternative stats and sun tap state in one save", async () => {
      const now = new Date("2026-05-11T10:00:00").getTime();
      jest.spyOn(Date, "now").mockReturnValue(now);
      const alternative = {
        id: "legacy-web:https://example.com",
        kind: "website" as const,
        label: "example.com",
        url: "https://example.com",
        createdTS: 0,
        shownCount: 1,
        dismissedCount: 0,
        openedCount: 0,
      };
      mockedGetSyncData.mockResolvedValue(
        createMockSyncData({
          alternatives: [alternative],
          sunTaps: {
            "2026-05-11": 2,
          },
          sunTapTimestamps: [],
        }),
      );
      mockedSaveSyncData.mockResolvedValue();

      await markAlternativeOpenedAndCountSunTap(alternative);

      expect(mockedSaveSyncData).toHaveBeenCalledTimes(1);
      expect(mockedSaveSyncData).toHaveBeenCalledWith(
        expect.objectContaining({
          alternatives: [
            {
              ...alternative,
              openedCount: 1,
            },
          ],
          sunTaps: {
            "2026-05-11": 3,
          },
          sunTapTimestamps: [now],
        }),
      );
    });
  });

  describe("markAlternativeDismissed", () => {
    it("disables the alternative when the public dismissal helper reaches the threshold", async () => {
      const now = new Date("2026-05-11T10:00:00").getTime();
      jest.spyOn(Date, "now").mockReturnValue(now);
      const alternative = {
        id: "legacy-web:https://example.com",
        kind: "website" as const,
        label: "example.com",
        url: "https://example.com",
        createdTS: 0,
        shownCount: 1,
        dismissedCount: 2,
        openedCount: 0,
      };
      mockedGetSyncData.mockResolvedValue(
        createMockSyncData({
          alternatives: [alternative],
        }),
      );
      mockedSaveSyncData.mockResolvedValue();

      await markAlternativeDismissed(alternative);

      expect(mockedSaveSyncData).toHaveBeenCalledWith(
        expect.objectContaining({
          alternatives: [
            {
              ...alternative,
              dismissedCount: 3,
              disabledTS: now,
            },
          ],
        }),
      );
    });
  });
});
