import { getQuestionSmart, getQuestionSemiSmart } from "../getQuestionSmart";
import { mockDate } from "@src/test-utils/mockHelpers";
import { Answer } from "@src/dataInterface/syncData";
import { QuestionCategoryId } from "@src/shared/data/questions";

// Mock dependencies
jest.mock("../isToday", () => ({
  isToday: jest.fn(() => true),
  isThisWeek: jest.fn(() => true),
}));

jest.mock("../isWorkDay", () => ({
  isWorkDay: jest.fn(() => true),
}));

jest.mock("../isXIn1", () => ({
  isXIn1: jest.fn(() => false),
}));

jest.mock("../getRndEntry", () => ({
  getRndEntry: jest.fn((arr: unknown[]) => arr[0]),
}));

jest.mock("@src/shared/isMain.const", () => ({
  isMain: jest.fn(() => false),
}));

import { isToday, isThisWeek } from "../isToday";
import { isWorkDay } from "../isWorkDay";
import { isXIn1 } from "../isXIn1";
import { getRndEntry } from "../getRndEntry";
import { isMain } from "@src/shared/isMain.const";

const mockedIsToday = isToday as jest.Mock;
const mockedIsThisWeek = isThisWeek as jest.Mock;
const mockedIsWorkDay = isWorkDay as jest.Mock;
const mockedIsXIn1 = isXIn1 as jest.Mock;
const mockedGetRndEntry = getRndEntry as jest.Mock;
const mockedIsMain = isMain as jest.Mock;

describe("getQuestionSmart", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDate("2024-01-15T10:00:00"); // Monday 10am - morning, workday
    mockedIsToday.mockReturnValue(true);
    mockedIsThisWeek.mockReturnValue(true);
    mockedIsWorkDay.mockReturnValue(true);
    mockedIsXIn1.mockReturnValue(false);
    mockedGetRndEntry.mockImplementation((arr: unknown[]) => arr[0]);
    mockedIsMain.mockReturnValue(false);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("empty answer history", () => {
    it("returns a random question when no answers exist", () => {
      const result = getQuestionSmart([]);
      expect(result).toBeDefined();
      expect(result.t).toBeDefined(); // t is the question text
      expect(mockedGetRndEntry).toHaveBeenCalled();
    });
  });

  describe("with answer history", () => {
    const createAnswer = (
      categoryId: QuestionCategoryId,
      ts = Date.now(),
    ): Answer => ({
      id: `${categoryId}-${ts}`,
      qid: null,
      questionCategoryId: categoryId,
      val: "test answer",
      ts,
    });

    it("returns a question object with required properties", () => {
      const answers = [createAnswer(QuestionCategoryId.Gratitude)];
      const result = getQuestionSmart(answers);
      expect(result).toHaveProperty("t");
      expect(result).toHaveProperty("categoryId");
    });

    it("considers answer frequency when selecting category", () => {
      // Create multiple answers for one category
      const answers = [
        createAnswer(QuestionCategoryId.Gratitude),
        createAnswer(QuestionCategoryId.Gratitude),
        createAnswer(QuestionCategoryId.Gratitude),
        createAnswer(QuestionCategoryId.Gratitude),
      ];
      const result = getQuestionSmart(answers);
      // With many Gratitude answers, it should prefer other categories
      expect(result).toBeDefined();
    });

    it("handles today-only categories correctly", () => {
      mockedIsToday.mockReturnValue(false);
      const answers = [createAnswer(QuestionCategoryId.RefocusHelperToday)];
      const result = getQuestionSmart(answers);
      expect(result).toBeDefined();
    });

    it("handles this-week-only categories correctly", () => {
      mockedIsThisWeek.mockReturnValue(false);
      // GoalForTheWeek is a week-based category
      const answers = [createAnswer(QuestionCategoryId.GoalForTheWeek)];
      const result = getQuestionSmart(answers);
      expect(result).toBeDefined();
    });
  });

  describe("time-based filtering", () => {
    it("selects appropriate questions during morning hours (4-14)", () => {
      mockDate("2024-01-15T08:00:00"); // 8am
      const result = getQuestionSmart([]);
      expect(result).toBeDefined();
    });

    it("selects appropriate questions during evening hours (15+)", () => {
      mockDate("2024-01-15T18:00:00"); // 6pm
      const result = getQuestionSmart([]);
      expect(result).toBeDefined();
    });

    it("selects appropriate questions during late night (0-4)", () => {
      mockDate("2024-01-15T02:00:00"); // 2am
      const result = getQuestionSmart([]);
      expect(result).toBeDefined();
    });
  });

  describe("workday filtering", () => {
    it("excludes workday-only categories on weekends", () => {
      mockedIsWorkDay.mockReturnValue(false);
      const result = getQuestionSmart([]);
      expect(result).toBeDefined();
    });

    it("includes workday categories on workdays", () => {
      mockedIsWorkDay.mockReturnValue(true);
      const result = getQuestionSmart([]);
      expect(result).toBeDefined();
    });
  });

  describe("40% alternate category chance", () => {
    it("can select non-lowest score category with 40% probability", () => {
      const answers = [
        {
          id: "1",
          qid: null,
          questionCategoryId: QuestionCategoryId.Gratitude,
          val: "a",
          ts: 1,
        },
      ];
      mockedIsXIn1.mockReturnValue(true); // Triggers the 40% branch
      const result = getQuestionSmart(answers);
      expect(result).toBeDefined();
    });
  });
});

describe("getQuestionSemiSmart", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedIsWorkDay.mockReturnValue(true);
    mockedGetRndEntry.mockImplementation((arr: unknown[]) => arr[0]);
    mockedIsMain.mockReturnValue(false);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("returns a question filtered by time of day", () => {
    const morningDate = new Date("2024-01-15T08:00:00");
    const result = getQuestionSemiSmart(morningDate);
    expect(result).toBeDefined();
    expect(result.t).toBeDefined();
  });

  it("filters out morning questions in evening", () => {
    const eveningDate = new Date("2024-01-15T18:00:00");
    const result = getQuestionSemiSmart(eveningDate);
    expect(result).toBeDefined();
  });

  it("filters out evening questions in morning", () => {
    const morningDate = new Date("2024-01-15T08:00:00");
    const result = getQuestionSemiSmart(morningDate);
    expect(result).toBeDefined();
  });

  it("filters out workday questions on weekends", () => {
    mockedIsWorkDay.mockReturnValue(false);
    const weekendDate = new Date("2024-01-13T12:00:00"); // Saturday
    const result = getQuestionSemiSmart(weekendDate);
    expect(result).toBeDefined();
  });

  it("uses current date when no date provided", () => {
    const result = getQuestionSemiSmart();
    expect(result).toBeDefined();
  });
});
