jest.mock("@dataInterface/syncDataInterface", () => ({
  getSyncDataN: jest.fn(),
  saveAnswerN: jest.fn(),
  saveSyncDataN: jest.fn(),
  patchSyncDataN: jest.fn(),
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
  markAlternativeOpenedAndCountSunTap,
  markPatternInsightShown,
  removeAlternative,
  renameAlternative,
  saveReplacementStructuredAlternativeApp,
  saveReplacementStructuredAlternativeWebsite,
  saveStructuredAlternativeApp,
  saveStructuredAlternativeWebsite,
} from "@src/dataInterface/commonSyncDataInterface";
import { getSyncDataN, patchSyncDataN } from "@dataInterface/syncDataInterface";
import { createMockSyncData } from "@src/test-utils/mockHelpers";

const mockedGetSyncData = getSyncDataN as jest.MockedFunction<
  typeof getSyncDataN
>;
const mockedPatchSyncData = patchSyncDataN as jest.MockedFunction<
  typeof patchSyncDataN
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
      mockedPatchSyncData.mockResolvedValue();

      await countSunTap();

      expect(mockedPatchSyncData).toHaveBeenCalledWith(
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
      mockedPatchSyncData.mockResolvedValue();

      await countSunTap();

      expect(mockedPatchSyncData).toHaveBeenCalledWith(
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
      mockedPatchSyncData.mockResolvedValue();

      await markAlternativeOpenedAndCountSunTap(alternative);

      expect(mockedPatchSyncData).toHaveBeenCalledTimes(1);
      expect(mockedPatchSyncData).toHaveBeenCalledWith(
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

    it("stores a legacy fallback alternative before recording an open", async () => {
      const now = new Date("2026-05-11T10:00:00").getTime();
      jest.spyOn(Date, "now").mockReturnValue(now);
      const alternative = {
        id: "legacy-web:https://example.com",
        kind: "website" as const,
        label: "example.com",
        url: "https://example.com",
        createdTS: 0,
        shownCount: 0,
        dismissedCount: 0,
        openedCount: 0,
      };
      mockedGetSyncData.mockResolvedValue(createMockSyncData());
      mockedPatchSyncData.mockResolvedValue();

      await markAlternativeOpenedAndCountSunTap(alternative);

      expect(mockedPatchSyncData).toHaveBeenCalledWith(
        expect.objectContaining({
          alternatives: [
            {
              ...alternative,
              openedCount: 1,
            },
          ],
          sunTaps: {
            "2026-05-11": 1,
          },
          sunTapTimestamps: [now],
        }),
      );
    });
  });

  describe("saveStructuredAlternativeWebsite", () => {
    it("stores a new website alternative in the structured alternatives list", async () => {
      const now = new Date("2026-05-11T10:00:00").getTime();
      jest.spyOn(Date, "now").mockReturnValue(now);
      mockedGetSyncData.mockResolvedValue(createMockSyncData());
      mockedPatchSyncData.mockResolvedValue();

      await saveStructuredAlternativeWebsite(" https://www.example.com/ ");

      expect(mockedPatchSyncData).toHaveBeenCalledWith(
        expect.objectContaining({
          alternatives: [
            {
              id: "legacy-web:https://www.example.com/",
              kind: "website",
              label: "example.com",
              url: "https://www.example.com/",
              createdTS: now,
              shownCount: 0,
              dismissedCount: 0,
              openedCount: 0,
            },
          ],
        }),
      );
    });

    it("revives an existing structured alternative when it is saved again", async () => {
      const now = new Date("2026-05-11T10:00:00").getTime();
      jest.spyOn(Date, "now").mockReturnValue(now);
      const alternative = {
        id: "legacy-web:https://example.com",
        kind: "website" as const,
        label: "example.com",
        url: "https://example.com",
        createdTS: 0,
        shownCount: 4,
        dismissedCount: 3,
        openedCount: 1,
        disabledTS: now - 1000,
      };
      mockedGetSyncData.mockResolvedValue(
        createMockSyncData({
          alternatives: [alternative],
        }),
      );
      mockedPatchSyncData.mockResolvedValue();

      await saveStructuredAlternativeWebsite("https://example.com");

      expect(mockedPatchSyncData).toHaveBeenCalledWith(
        expect.objectContaining({
          alternatives: [
            {
              id: "legacy-web:https://example.com",
              kind: "website",
              label: "example.com",
              url: "https://example.com",
              createdTS: now,
              shownCount: 0,
              dismissedCount: 0,
              openedCount: 0,
            },
          ],
        }),
      );
    });
  });

  describe("saveStructuredAlternativeApp", () => {
    it("stores a new app alternative in the structured alternatives list", async () => {
      const now = new Date("2026-05-11T10:00:00").getTime();
      jest.spyOn(Date, "now").mockReturnValue(now);
      mockedGetSyncData.mockResolvedValue(createMockSyncData());
      mockedPatchSyncData.mockResolvedValue();

      await saveStructuredAlternativeApp(" Reader ");

      expect(mockedPatchSyncData).toHaveBeenCalledWith(
        expect.objectContaining({
          alternatives: [
            {
              id: "legacy-app:Reader",
              kind: "app",
              label: "Reader",
              createdTS: now,
              shownCount: 0,
              dismissedCount: 0,
              openedCount: 0,
            },
          ],
        }),
      );
    });
  });

  describe("saveReplacementStructuredAlternativeWebsite", () => {
    it("disables the current website alternative and stores the replacement", async () => {
      const now = new Date("2026-05-11T10:00:00").getTime();
      jest.spyOn(Date, "now").mockReturnValue(now);
      const current = {
        id: "legacy-web:https://example.com",
        kind: "website" as const,
        label: "example.com",
        url: "https://example.com",
        createdTS: 0,
        shownCount: 1,
        dismissedCount: 0,
        openedCount: 0,
      };
      const other = {
        id: "legacy-web:https://other.example",
        kind: "website" as const,
        label: "other.example",
        url: "https://other.example",
        createdTS: 0,
        shownCount: 0,
        dismissedCount: 0,
        openedCount: 0,
      };
      mockedGetSyncData.mockResolvedValue(
        createMockSyncData({
          alternatives: [current, other],
          alternativeWebsites: ["https://example.com"],
        }),
      );
      mockedPatchSyncData.mockResolvedValue();

      await saveReplacementStructuredAlternativeWebsite(
        current,
        " https://better.example/ ",
      );

      expect(mockedPatchSyncData).toHaveBeenCalledWith(
        expect.objectContaining({
          alternatives: [
            {
              ...current,
              disabledTS: now,
            },
            other,
            {
              id: "legacy-web:https://better.example/",
              kind: "website",
              label: "better.example",
              url: "https://better.example/",
              createdTS: now,
              shownCount: 0,
              dismissedCount: 0,
              openedCount: 0,
            },
          ],
        }),
      );
    });

    it("hides a legacy fallback website when replacing it before stats exist", async () => {
      const now = new Date("2026-05-11T10:00:00").getTime();
      jest.spyOn(Date, "now").mockReturnValue(now);
      const current = {
        id: "legacy-web:https://example.com",
        kind: "website" as const,
        label: "example.com",
        url: "https://example.com",
        createdTS: 0,
        shownCount: 0,
        dismissedCount: 0,
        openedCount: 0,
      };
      mockedGetSyncData.mockResolvedValue(
        createMockSyncData({
          alternativeWebsites: ["https://example.com"],
        }),
      );
      mockedPatchSyncData.mockResolvedValue();

      await saveReplacementStructuredAlternativeWebsite(
        current,
        "https://better.example",
      );

      expect(mockedPatchSyncData).toHaveBeenCalledWith(
        expect.objectContaining({
          alternatives: [
            {
              ...current,
              disabledTS: now,
            },
            {
              id: "legacy-web:https://better.example",
              kind: "website",
              label: "better.example",
              url: "https://better.example",
              createdTS: now,
              shownCount: 0,
              dismissedCount: 0,
              openedCount: 0,
            },
          ],
        }),
      );
    });
  });

  describe("saveReplacementStructuredAlternativeApp", () => {
    it("disables the current app alternative and stores the replacement", async () => {
      const now = new Date("2026-05-11T10:00:00").getTime();
      jest.spyOn(Date, "now").mockReturnValue(now);
      const current = {
        id: "legacy-app:Reader",
        kind: "app" as const,
        label: "Reader",
        createdTS: 0,
        shownCount: 1,
        dismissedCount: 0,
        openedCount: 0,
      };
      mockedGetSyncData.mockResolvedValue(
        createMockSyncData({
          alternatives: [current],
          alternativeApps: ["Reader"],
        }),
      );
      mockedPatchSyncData.mockResolvedValue();

      await saveReplacementStructuredAlternativeApp(current, "Notes");

      expect(mockedPatchSyncData).toHaveBeenCalledWith(
        expect.objectContaining({
          alternatives: [
            {
              ...current,
              disabledTS: now,
            },
            {
              id: "legacy-app:Notes",
              kind: "app",
              label: "Notes",
              createdTS: now,
              shownCount: 0,
              dismissedCount: 0,
              openedCount: 0,
            },
          ],
        }),
      );
    });
  });

  describe("removeAlternative", () => {
    it("takes the entry out of the structured list for good", async () => {
      const kept = {
        id: "legacy-app:Notes",
        kind: "app" as const,
        label: "Notes",
        createdTS: 1,
        shownCount: 0,
        dismissedCount: 0,
        openedCount: 0,
      };
      const mistake = {
        id: "legacy-app:asdfgh",
        kind: "app" as const,
        label: "asdfgh",
        createdTS: 2,
        shownCount: 3,
        dismissedCount: 1,
        openedCount: 0,
      };
      mockedGetSyncData.mockResolvedValue(
        createMockSyncData({ alternatives: [kept, mistake] }),
      );
      mockedPatchSyncData.mockResolvedValue();

      await removeAlternative(mistake);

      expect(mockedPatchSyncData).toHaveBeenCalledWith(
        expect.objectContaining({ alternatives: [kept] }),
      );
    });

    it("also drops the legacy string, so the entry can't come back on the next read", async () => {
      const legacyMistake = {
        id: "legacy-web:htttps://exampel",
        kind: "website" as const,
        label: "htttps://exampel",
        url: "htttps://exampel",
        createdTS: 0,
        shownCount: 0,
        dismissedCount: 0,
        openedCount: 0,
      };
      mockedGetSyncData.mockResolvedValue(
        createMockSyncData({
          alternativeWebsites: ["htttps://exampel", "https://example.com"],
          alternativeApps: ["Books"],
        }),
      );
      mockedPatchSyncData.mockResolvedValue();

      await removeAlternative(legacyMistake);

      expect(mockedPatchSyncData).toHaveBeenCalledWith(
        expect.objectContaining({
          alternatives: [],
          alternativeWebsites: ["https://example.com"],
          alternativeApps: ["Books"],
        }),
      );
    });
  });

  describe("renameAlternative", () => {
    it("replaces the entry outright, keeping its place and resetting its counters", async () => {
      const mistake = {
        id: "legacy-app:Bokks",
        kind: "app" as const,
        label: "Bokks",
        createdTS: 111,
        shownCount: 4,
        dismissedCount: 2,
        openedCount: 0,
      };
      mockedGetSyncData.mockResolvedValue(
        createMockSyncData({
          alternatives: [mistake],
          alternativeApps: ["Bokks"],
        }),
      );
      mockedPatchSyncData.mockResolvedValue();

      await renameAlternative(mistake, " Books ");

      expect(mockedPatchSyncData).toHaveBeenCalledWith(
        expect.objectContaining({
          alternatives: [
            {
              id: "legacy-app:Books",
              kind: "app",
              label: "Books",
              createdTS: 111,
              shownCount: 0,
              dismissedCount: 0,
              openedCount: 0,
            },
          ],
          alternativeApps: [],
        }),
      );
    });

    it("revives a retired entry when renaming onto it, rather than leaving it disabled", async () => {
      const retired = {
        id: "legacy-app:Books",
        kind: "app" as const,
        label: "Books",
        createdTS: 10,
        shownCount: 3,
        dismissedCount: 3,
        openedCount: 0,
        disabledTS: 20,
      };
      const mistake = {
        id: "legacy-app:Bokks",
        kind: "app" as const,
        label: "Bokks",
        createdTS: 30,
        shownCount: 0,
        dismissedCount: 0,
        openedCount: 0,
      };
      mockedGetSyncData.mockResolvedValue(
        createMockSyncData({ alternatives: [retired, mistake] }),
      );
      mockedPatchSyncData.mockResolvedValue();

      await renameAlternative(mistake, "Books");

      expect(mockedPatchSyncData).toHaveBeenCalledWith(
        expect.objectContaining({
          alternatives: [
            {
              id: "legacy-app:Books",
              kind: "app",
              label: "Books",
              createdTS: 30,
              shownCount: 0,
              dismissedCount: 0,
              openedCount: 0,
            },
          ],
        }),
      );
    });
  });

  describe("markPatternInsightShown", () => {
    it("records a shown pattern insight for its date", async () => {
      mockedGetSyncData.mockResolvedValue(createMockSyncData());
      mockedPatchSyncData.mockResolvedValue();

      await markPatternInsightShown({
        id: "return-loop",
        dateISO: "2026-05-11",
        message:
          "You've come back a few times in a short while. That's okay - see if you can just notice the pull, without having to act on it.",
        actions: ["still_on_purpose", "leave_now"],
      });

      expect(mockedPatchSyncData).toHaveBeenCalledWith(
        expect.objectContaining({
          patternInsightState: {
            shownInsightIdsByDate: {
              "2026-05-11": ["return-loop"],
            },
          },
        }),
      );
    });
  });
});
