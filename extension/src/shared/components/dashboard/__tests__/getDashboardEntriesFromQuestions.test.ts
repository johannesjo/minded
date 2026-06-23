import {
  CENTER_INDEX,
  getDashboardEntriesFromQuestions,
} from "../getDashboardEntriesFromQuestions";
import {
  createMockSyncData,
  mockDate,
  mockRandom,
} from "@src/test-utils/mockHelpers";
import {
  DashboardGroupTxtQuestion,
  DashboardGroupType,
} from "../dashboard.model";
import { QuestionCategoryId } from "@src/shared/data/questions";
import { isToday } from "@src/util/isToday";

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

  // The greeting "reflects, never measures": only reflective/self-report cards
  // (or a calm quote) may be the centre pick the dashboard opens on.
  describe("greeting (centre pick) selection", () => {
    const now = new Date("2024-01-15T12:00:00");

    // Mirror the view's hero-index logic (DashboardGroups.getHeroIndex).
    const greetingOf = (
      entries: ReturnType<typeof getDashboardEntriesFromQuestions>,
    ) =>
      entries[
        entries.length > CENTER_INDEX ? CENTER_INDEX : entries.length - 1
      ];

    const reflectiveAnswer = (categoryId: QuestionCategoryId, id: string) => ({
      id,
      qid: null,
      questionCategoryId: categoryId,
      val: `answer ${id}`,
      ts: Date.now(),
    });

    beforeEach(() => {
      // Let today's self-report cards (mood, energy) and all answers qualify so
      // they're present in the pool to choose from.
      (isToday as jest.Mock).mockReturnValue(true);
    });

    afterEach(() => {
      // Don't leak the override into the rest of the suite.
      (isToday as jest.Mock).mockReturnValue(false);
    });

    it("never greets with a measurement card (the stats counter), whatever the random pick", () => {
      const syncData = createMockSyncData({
        // → a minded-decisions tally; it should never be the calm first card.
        sunTaps: { "2024-01-15": 5 },
        attempts: { "2024-01-15": 12 },
        answers: [
          reflectiveAnswer(QuestionCategoryId.GoodPlans, "a1"),
          reflectiveAnswer(QuestionCategoryId.Motivation, "a2"),
          reflectiveAnswer(QuestionCategoryId.Gratitude, "a3"),
          reflectiveAnswer(QuestionCategoryId.HelpfulTools, "a4"),
        ],
      });

      const measuringTypes = [DashboardGroupType.Stats];

      // Sweep the pick across the whole [0, 1) range; the greeting must always
      // be a reflective card or a quote, never a measurement card.
      for (let r = 0; r < 1; r += 0.05) {
        mockRandom(r);
        expect(measuringTypes).not.toContain(
          greetingOf(getDashboardEntriesFromQuestions(syncData, now)).type,
        );
      }
    });

    it("lets a self-report card (energy) be the greeting — it's no longer pinned out of the pool", () => {
      const syncData = createMockSyncData({
        answers: [
          reflectiveAnswer(QuestionCategoryId.GoodPlans, "a1"),
          reflectiveAnswer(QuestionCategoryId.Motivation, "a2"),
          reflectiveAnswer(QuestionCategoryId.Gratitude, "a3"),
        ],
      });

      const greetingTypes = new Set<DashboardGroupType>();
      for (let r = 0; r < 1; r += 0.05) {
        mockRandom(r);
        greetingTypes.add(
          greetingOf(getDashboardEntriesFromQuestions(syncData, now)).type,
        );
      }

      // Energy is a fixed card that the old index-range pick could never reach.
      expect(greetingTypes).toContain(DashboardGroupType.EnergyLvl);
    });

    it("avoids repeating the greeting shown last time, so each landing surfaces a new tile", () => {
      const syncData = createMockSyncData({
        answers: [
          reflectiveAnswer(QuestionCategoryId.GoodPlans, "a1"),
          reflectiveAnswer(QuestionCategoryId.Motivation, "a2"),
          reflectiveAnswer(QuestionCategoryId.Gratitude, "a3"),
          reflectiveAnswer(QuestionCategoryId.HelpfulTools, "a4"),
        ],
      });

      // First landing: take whatever the pick lands on, then derive its key the
      // same way the view does.
      mockRandom(0.1);
      const first = greetingOf(getDashboardEntriesFromQuestions(syncData, now));
      const firstKey = "id" in first ? first.id : first.type;

      // Next landing with the SAME random draw would normally repeat the same
      // tile — but passing the last key as avoidGreetingKey must steer it away.
      mockRandom(0.1);
      const second = greetingOf(
        getDashboardEntriesFromQuestions(syncData, now, firstKey),
      );
      const secondKey = "id" in second ? second.id : second.type;

      expect(secondKey).not.toBe(firstKey);
    });

    it("still greets even when the avoided tile is the only option (never leaves nothing)", () => {
      // Only one reflective card present; the pool is just it + the quote.
      const syncData = createMockSyncData({
        answers: [reflectiveAnswer(QuestionCategoryId.GoodPlans, "a1")],
      });

      // Avoid the quote AND draw toward the quote slot — it must still produce a
      // valid greeting rather than nothing.
      mockRandom(0.999);
      const entries = getDashboardEntriesFromQuestions(
        syncData,
        now,
        DashboardGroupType.Quote,
      );

      expect(greetingOf(entries)).toBeDefined();
    });

    it("can greet with a quote even on a full day (quote is a regular pool option, not just a <5-card fallback)", () => {
      const syncData = createMockSyncData({
        answers: [
          reflectiveAnswer(QuestionCategoryId.GoodPlans, "a1"),
          reflectiveAnswer(QuestionCategoryId.Motivation, "a2"),
          reflectiveAnswer(QuestionCategoryId.Gratitude, "a3"),
          reflectiveAnswer(QuestionCategoryId.HelpfulTools, "a4"),
        ],
      });

      // r→1 selects the last pool slot, which is always the quote.
      mockRandom(0.999);
      const entries = getDashboardEntriesFromQuestions(syncData, now);

      expect(entries.length).toBeGreaterThanOrEqual(5);
      expect(greetingOf(entries).type).toBe(DashboardGroupType.Quote);
    });
  });
});
