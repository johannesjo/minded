import { getInteractionMode, InteractionMode } from "../getInteractionMode";
import {
  createMockSyncData,
  mockDate,
  mockRandom,
} from "@src/test-utils/mockHelpers";
import { QuestionCategoryId } from "@src/shared/data/questions";

// Mock dependencies
jest.mock("@src/util/isToday", () => ({
  isToday: jest.fn((ts: number) => ts > 1000), // Simple mock: > 1000 means "today"
  hasHappenedInLastXDay: jest.fn(() => false),
}));

jest.mock("@src/util/isXIn1", () => ({
  isXIn1: jest.fn(() => false),
}));

jest.mock("@src/dataInterface/commonSyncDataInterface", () => ({
  IS_ANDROID: false,
  IS_APP: false,
}));

jest.mock("@src/shared/isMain.const", () => ({
  isMain: jest.fn(() => true),
}));

import { isToday, hasHappenedInLastXDay } from "@src/util/isToday";
import { isXIn1 } from "@src/util/isXIn1";
import { isMain } from "@src/shared/isMain.const";

const mockedIsToday = isToday as jest.Mock;
const mockedHasHappenedInLastXDay = hasHappenedInLastXDay as jest.Mock;
const mockedIsXIn1 = isXIn1 as jest.Mock;
const mockedIsMain = isMain as jest.Mock;

describe("getInteractionMode", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDate("2024-01-15T12:00:00"); // Monday noon
    mockedIsToday.mockReturnValue(false);
    mockedHasHappenedInLastXDay.mockReturnValue(false);
    mockedIsXIn1.mockReturnValue(false);
    mockedIsMain.mockReturnValue(true);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("first-time user", () => {
    it("returns QUESTION when user has no answers", () => {
      const syncData = createMockSyncData({ answers: [] });
      expect(getInteractionMode(syncData)).toBe("QUESTION");
    });

    it("returns QUESTION when user has only 1 answer", () => {
      const syncData = createMockSyncData({
        answers: [
          {
            id: "1",
            qid: null,
            questionCategoryId: QuestionCategoryId.Gratitude,
            val: "test",
            ts: 1,
          },
        ],
      });
      expect(getInteractionMode(syncData)).toBe("QUESTION");
    });
  });

  describe("SELF_ASSESSMENT mode", () => {
    it("returns SELF_ASSESSMENT with 10% probability", () => {
      const syncData = createMockSyncData({
        answers: [
          {
            id: "1",
            qid: null,
            questionCategoryId: QuestionCategoryId.Gratitude,
            val: "a",
            ts: 1,
          },
          {
            id: "2",
            qid: null,
            questionCategoryId: QuestionCategoryId.Gratitude,
            val: "b",
            ts: 2,
          },
        ],
      });
      mockedIsXIn1.mockImplementation((x: number) => x === 1 / 10);
      expect(getInteractionMode(syncData)).toBe("SELF_ASSESSMENT");
    });
  });

  describe("EMOTION_LABELING mode", () => {
    it("returns EMOTION_LABELING when not done today and 10% probability", () => {
      const syncData = createMockSyncData({
        answers: [
          {
            id: "1",
            qid: null,
            questionCategoryId: QuestionCategoryId.Gratitude,
            val: "a",
            ts: 1,
          },
          {
            id: "2",
            qid: null,
            questionCategoryId: QuestionCategoryId.Gratitude,
            val: "b",
            ts: 2,
          },
        ],
        emotionLabeling: { ts: 100, emotions: [], bodyLocations: [] }, // Not today (ts <= 1000)
      });
      mockedIsToday.mockImplementation((ts: number) => ts > 1000);
      mockedIsXIn1.mockImplementation((x: number) => {
        if (x === 1 / 10) return true;
        return false;
      });
      // First call is for SELF_ASSESSMENT (return false), second for EMOTION_LABELING (return true)
      let callCount = 0;
      mockedIsXIn1.mockImplementation(() => {
        callCount++;
        return callCount === 2;
      });
      expect(getInteractionMode(syncData)).toBe("EMOTION_LABELING");
    });
  });

  describe("MOOD_CHECKIN mode", () => {
    it("returns MOOD_CHECKIN when not done today and 33% probability", () => {
      const syncData = createMockSyncData({
        answers: [
          {
            id: "1",
            qid: null,
            questionCategoryId: QuestionCategoryId.Gratitude,
            val: "a",
            ts: 1,
          },
          {
            id: "2",
            qid: null,
            questionCategoryId: QuestionCategoryId.Gratitude,
            val: "b",
            ts: 2,
          },
        ],
        moodCheckTS: 100, // Not today
      });
      mockedIsToday.mockReturnValue(false);
      let callCount = 0;
      mockedIsXIn1.mockImplementation(() => {
        callCount++;
        return callCount === 3; // Third probability check (after SELF_ASSESSMENT and EMOTION_LABELING)
      });
      expect(getInteractionMode(syncData)).toBe("MOOD_CHECKIN");
    });
  });

  describe("ENERGY_LVL mode", () => {
    it("returns ENERGY_LVL during valid hours (5-19) when not done today", () => {
      mockDate("2024-01-15T10:00:00"); // 10am
      const syncData = createMockSyncData({
        answers: [
          {
            id: "1",
            qid: null,
            questionCategoryId: QuestionCategoryId.Gratitude,
            val: "a",
            ts: 1,
          },
          {
            id: "2",
            qid: null,
            questionCategoryId: QuestionCategoryId.Gratitude,
            val: "b",
            ts: 2,
          },
        ],
        energyLvlTS: 100, // Not today
      });
      mockedIsToday.mockReturnValue(false);
      let callCount = 0;
      mockedIsXIn1.mockImplementation(() => {
        callCount++;
        return callCount === 5; // Fifth probability check for ENERGY_LVL
      });
      expect(getInteractionMode(syncData)).toBe("ENERGY_LVL");
    });

    it("does not return ENERGY_LVL outside valid hours", () => {
      mockDate("2024-01-15T20:00:00"); // 8pm - outside 5-19
      const syncData = createMockSyncData({
        answers: [
          {
            id: "1",
            qid: null,
            questionCategoryId: QuestionCategoryId.Gratitude,
            val: "a",
            ts: 1,
          },
          {
            id: "2",
            qid: null,
            questionCategoryId: QuestionCategoryId.Gratitude,
            val: "b",
            ts: 2,
          },
        ],
        energyLvlTS: 100,
      });
      mockedIsToday.mockReturnValue(false);
      mockedIsXIn1.mockReturnValue(false);
      expect(getInteractionMode(syncData)).toBe("QUESTION");
    });
  });

  describe("APP_USAGE_OR_BROWSING_BEHAVIOR mode", () => {
    it("returns APP_USAGE_OR_BROWSING_BEHAVIOR when not happened in last 2 days", () => {
      const syncData = createMockSyncData({
        answers: [
          {
            id: "1",
            qid: null,
            questionCategoryId: QuestionCategoryId.Gratitude,
            val: "a",
            ts: 1,
          },
          {
            id: "2",
            qid: null,
            questionCategoryId: QuestionCategoryId.Gratitude,
            val: "b",
            ts: 2,
          },
        ],
        lastBrowsingBehaviorRatingTS: 100,
      });
      mockedHasHappenedInLastXDay.mockReturnValue(false);
      let callCount = 0;
      mockedIsXIn1.mockImplementation(() => {
        callCount++;
        return callCount === 6; // Sixth probability check
      });
      expect(getInteractionMode(syncData)).toBe(
        "APP_USAGE_OR_BROWSING_BEHAVIOR",
      );
    });
  });

  describe("default fallback", () => {
    it("returns QUESTION when no other mode is selected", () => {
      const syncData = createMockSyncData({
        answers: [
          {
            id: "1",
            qid: null,
            questionCategoryId: QuestionCategoryId.Gratitude,
            val: "a",
            ts: 1,
          },
          {
            id: "2",
            qid: null,
            questionCategoryId: QuestionCategoryId.Gratitude,
            val: "b",
            ts: 2,
          },
        ],
      });
      mockedIsXIn1.mockReturnValue(false);
      expect(getInteractionMode(syncData)).toBe("QUESTION");
    });
  });

  describe("EMOJI_CHECKIN mode", () => {
    it("returns EMOJI_CHECKIN with 1% probability", () => {
      const syncData = createMockSyncData({
        answers: [
          {
            id: "1",
            qid: null,
            questionCategoryId: QuestionCategoryId.Gratitude,
            val: "a",
            ts: 1,
          },
          {
            id: "2",
            qid: null,
            questionCategoryId: QuestionCategoryId.Gratitude,
            val: "b",
            ts: 2,
          },
        ],
      });
      let callCount = 0;
      mockedIsXIn1.mockImplementation(() => {
        callCount++;
        return callCount === 8; // Eighth probability check for EMOJI_CHECKIN
      });
      expect(getInteractionMode(syncData)).toBe("EMOJI_CHECKIN");
    });
  });
});
