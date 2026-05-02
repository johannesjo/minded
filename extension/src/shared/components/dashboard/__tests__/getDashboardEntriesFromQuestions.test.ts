import { getDashboardEntriesFromQuestions } from "../getDashboardEntriesFromQuestions";
import {
  createMockSyncData,
  mockDate,
  mockRandom,
} from "@src/test-utils/mockHelpers";
import {
  DashboardGroupDailyBudgetRemaining,
  DashboardGroupTxtQuestion,
  DashboardGroupType,
} from "../dashboard.model";
import { QuestionCategoryId } from "@src/shared/data/questions";

jest.mock("@src/dataInterface/commonSyncDataInterface", () => ({
  IS_ANDROID: false,
  IS_APP: false,
}));

jest.mock("@src/util/isToday", () => ({
  isToday: jest.fn(() => false),
  isThisWeek: jest.fn(() => false),
}));

describe("getDashboardEntriesFromQuestions", () => {
  beforeEach(() => {
    mockDate("2024-01-15T12:00:00");
    mockRandom(0.5);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("daily budget card", () => {
    it("should insert DailyBudgetRemaining as first card when dailyBudget is configured", () => {
      const syncData = createMockSyncData({
        dailyBudget: { globalMinutes: 30 },
        dailyUsage: {
          "2024-01-15": { totalSeconds: 600, perSite: {} },
        },
      });

      const result = getDashboardEntriesFromQuestions(
        syncData,
        new Date("2024-01-15T12:00:00"),
      );

      const budgetCard = result[0] as DashboardGroupDailyBudgetRemaining;
      expect(budgetCard.type).toBe(DashboardGroupType.DailyBudgetRemaining);
      expect(budgetCard.remainingSeconds).toBe(1200); // 30*60 - 600
      expect(budgetCard.totalBudgetSeconds).toBe(1800); // 30*60
    });

    it("should not insert DailyBudgetRemaining when dailyBudget is null", () => {
      const syncData = createMockSyncData({
        dailyBudget: null,
        dailyUsage: {},
      });

      const result = getDashboardEntriesFromQuestions(
        syncData,
        new Date("2024-01-15T12:00:00"),
      );

      const budgetCard = result.find(
        (g) => g.type === DashboardGroupType.DailyBudgetRemaining,
      );
      expect(budgetCard).toBeUndefined();
    });

    it("should show 0 remaining when budget is exhausted", () => {
      const syncData = createMockSyncData({
        dailyBudget: { globalMinutes: 10 },
        dailyUsage: {
          "2024-01-15": { totalSeconds: 700, perSite: {} },
        },
      });

      const result = getDashboardEntriesFromQuestions(
        syncData,
        new Date("2024-01-15T12:00:00"),
      );

      const budgetCard = result[0] as DashboardGroupDailyBudgetRemaining;
      expect(budgetCard.type).toBe(DashboardGroupType.DailyBudgetRemaining);
      expect(budgetCard.remainingSeconds).toBe(0);
      expect(budgetCard.totalBudgetSeconds).toBe(600); // 10*60
    });
  });

  describe("sleep wind-down brain dump", () => {
    it("should show sleep wind-down answers as their own dashboard category", () => {
      const syncData = createMockSyncData({
        answers: [
          {
            id: "sleep-1",
            qid: null,
            questionCategoryId: QuestionCategoryId.SleepWindDown,
            val: "Tomorrow can wait.",
            ts: Date.now(),
          },
        ],
      });

      const result = getDashboardEntriesFromQuestions(
        syncData,
        new Date("2024-01-15T12:00:00"),
      );

      const windDownCard = result.find(
        (g) =>
          g.type === DashboardGroupType.TxtQuestion &&
          "id" in g &&
          g.id === QuestionCategoryId.SleepWindDown,
      ) as DashboardGroupTxtQuestion | undefined;

      expect(windDownCard).toBeDefined();
      expect(windDownCard?.dashboardTxt).toBe("Wind-Down Brain Dump");
      expect(windDownCard?.answers[0].val).toBe("Tomorrow can wait.");
    });
  });
});
