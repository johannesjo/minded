import {
  CENTER_INDEX,
  getDashboardEntriesFromQuestions,
  guardHeroSlot,
  isGreetingEligible,
} from "../getDashboardEntriesFromQuestions";
import {
  createMockSyncData,
  mockDate,
  mockRandom,
} from "@src/test-utils/mockHelpers";
import {
  DashboardGroup,
  DashboardGroupTxtQuestion,
  DashboardGroupType,
} from "../dashboard.model";
import { QuestionCategoryId } from "@src/shared/data/questions";
import { isThisWeek, isToday } from "@src/util/isToday";

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

  // The greeting "reflects, never measures": only reflective/self-report cards -
  // the user's own answers, mood, energy - may be the centre pick the dashboard
  // opens on. There is no filler card to fall back on (the quote was removed),
  // so "nothing qualifies" means "no greeting", never "greet with something
  // borrowed".
  describe("greeting (centre pick) selection", () => {
    const now = new Date("2024-01-15T12:00:00");

    // Mirror the view's hero-index logic (DashboardGroups.heroOf).
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
      // Don't leak the overrides into the rest of the suite.
      (isToday as jest.Mock).mockReturnValue(false);
      (isThisWeek as jest.Mock).mockReturnValue(false);
    });

    it("lets a self-report card (energy) be the greeting - it's no longer pinned out of the pool", () => {
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
      const firstKey = first.id;

      // Next landing with the SAME random draw would normally repeat the same
      // tile - but passing the last key as avoidGreetingKey must steer it away.
      mockRandom(0.1);
      const second = greetingOf(
        getDashboardEntriesFromQuestions(syncData, now, firstKey),
      );
      const secondKey = second.id;

      expect(secondKey).not.toBe(firstKey);
    });

    it("still greets even when the avoided tile is the only option (never leaves nothing)", () => {
      // Only one reflective card present, and it's the one we'd rather not
      // repeat - narrowing the pool must not leave nothing to greet with.
      const syncData = createMockSyncData({
        answers: [reflectiveAnswer(QuestionCategoryId.GoodPlans, "a1")],
      });

      mockRandom(0.999);
      const entries = getDashboardEntriesFromQuestions(
        syncData,
        now,
        QuestionCategoryId.GoodPlans,
      );

      expect(greetingOf(entries)).toBeDefined();
      expect(isGreetingEligible(greetingOf(entries), now)).toBe(true);
    });

    // The greeting is a present-moment surface, so a question recap may only
    // greet inside the same time-of-day / work-day window its live question
    // would (e.g. "Finding Focus Today" is a morning, work-day category).
    it("never greets with an out-of-window question recap (no 'Finding Focus Today' in the middle of the night)", () => {
      // Monday 03:00 - past the morning window the focus category is gated to.
      const night = new Date("2024-01-15T03:00:00");
      const syncData = createMockSyncData({
        answers: [
          reflectiveAnswer(QuestionCategoryId.RefocusHelperToday, "f1"),
          reflectiveAnswer(QuestionCategoryId.Motivation, "a2"),
          reflectiveAnswer(QuestionCategoryId.Gratitude, "a3"),
        ],
      });

      for (let r = 0; r < 1; r += 0.05) {
        mockRandom(r);
        const greeting = greetingOf(
          getDashboardEntriesFromQuestions(syncData, night),
        );
        const isFocusTile =
          greeting.type === DashboardGroupType.TxtQuestion &&
          "id" in greeting &&
          greeting.id === QuestionCategoryId.RefocusHelperToday;
        expect(isFocusTile).toBe(false);
      }
    });

    it("can greet with a question recap once it's inside its window ('Finding Focus Today' on a work-day morning)", () => {
      // Monday 09:00 - inside the morning / work-day window.
      const morning = new Date("2024-01-15T09:00:00");
      const syncData = createMockSyncData({
        answers: [
          reflectiveAnswer(QuestionCategoryId.RefocusHelperToday, "f1"),
        ],
      });

      const greetingIds = new Set<QuestionCategoryId>();
      for (let r = 0; r < 1; r += 0.05) {
        mockRandom(r);
        const greeting = greetingOf(
          getDashboardEntriesFromQuestions(syncData, morning),
        );
        if (
          greeting.type === DashboardGroupType.TxtQuestion &&
          "id" in greeting
        )
          greetingIds.add(greeting.id);
      }

      expect(greetingIds).toContain(QuestionCategoryId.RefocusHelperToday);
    });

    // The random pick already keeps an out-of-window recap out of the pool
    // (isGreetingEligible), but the incremental merge (updateDashboardEntries)
    // can leave a once-fresh recap sitting in the hero slot as the hours pass.
    // guardHeroSlot is the safety net for that path: if the hero is a stale
    // recap, swap in a card that can greet now (the stale one stays in
    // "look back").
    it("guardHeroSlot swaps a stale recap out of the hero slot for one that can greet now", () => {
      // Monday 03:00 - past the morning window RefocusHelperToday is gated to.
      const night = new Date("2024-01-15T03:00:00");
      const recap = (id: QuestionCategoryId): DashboardGroup => ({
        id,
        type: DashboardGroupType.TxtQuestion,
        dashboardTxt: "x",
        answers: [],
      });
      // ≥5 cards with the stale morning recap sitting in the hero slot (index 4).
      const entries: DashboardGroup[] = [
        recap(QuestionCategoryId.HelpfulTools),
        recap(QuestionCategoryId.GoodPlans),
        recap(QuestionCategoryId.Motivation),
        recap(QuestionCategoryId.Gratitude),
        recap(QuestionCategoryId.RefocusHelperToday),
      ];

      const guarded = guardHeroSlot(entries, night);

      // The greeting must not be the stale morning recap - another in-window
      // card takes the slot - and the recap is still present for the
      // "look back" grid.
      expect(isGreetingEligible(greetingOf(guarded), night)).toBe(true);
      expect(
        guarded.some(
          (e) =>
            e.type === DashboardGroupType.TxtQuestion &&
            "id" in e &&
            e.id === QuestionCategoryId.RefocusHelperToday,
        ),
      ).toBe(true);
    });

    // The counterpart: with no card able to greet, guardHeroSlot leaves the
    // arrangement alone rather than inventing a filler. The view then shows no
    // greeting at all (DashboardGroups.heroOf re-checks eligibility), which is
    // the whole point of removing the quote card.
    it("guardHeroSlot leaves a stale hero in place when nothing else can greet - no filler card is invented", () => {
      const night = new Date("2024-01-15T03:00:00");
      const entries: DashboardGroup[] = [
        {
          id: QuestionCategoryId.RefocusHelperToday,
          type: DashboardGroupType.TxtQuestion,
          dashboardTxt: "x",
          answers: [],
        },
      ];

      const guarded = guardHeroSlot(entries, night);

      expect(guarded).toHaveLength(1);
      expect(isGreetingEligible(guarded[0], night)).toBe(false);
    });

    it("greets with nothing at all on an empty profile (no borrowed filler card)", () => {
      // Nothing answered, and no self-report from today either.
      (isToday as jest.Mock).mockReturnValue(false);

      const entries = getDashboardEntriesFromQuestions(
        createMockSyncData({ answers: [] }),
        now,
      );

      expect(entries).toHaveLength(0);
    });

    // Symmetry with the night/focus case: an evening recap shouldn't greet in
    // the morning either. (GoodToday - "What went well today" - is evening-only.)
    it("never greets with an evening recap in the morning", () => {
      const morning = new Date("2024-01-15T09:00:00");
      const syncData = createMockSyncData({
        answers: [
          reflectiveAnswer(QuestionCategoryId.GoodToday, "e1"),
          reflectiveAnswer(QuestionCategoryId.Motivation, "a2"),
          reflectiveAnswer(QuestionCategoryId.Gratitude, "a3"),
        ],
      });

      for (let r = 0; r < 1; r += 0.05) {
        mockRandom(r);
        const greeting = greetingOf(
          getDashboardEntriesFromQuestions(syncData, morning),
        );
        const isEveningRecap =
          greeting.type === DashboardGroupType.TxtQuestion &&
          "id" in greeting &&
          greeting.id === QuestionCategoryId.GoodToday;
        expect(isEveningRecap).toBe(false);
      }

      // Sanity: the evening recap IS built (so the test isn't passing only
      // because the card was never there) - it just never greets in the morning.
      const built = getDashboardEntriesFromQuestions(syncData, morning).some(
        (e) =>
          e.type === DashboardGroupType.TxtQuestion &&
          "id" in e &&
          e.id === QuestionCategoryId.GoodToday,
      );
      expect(built).toBe(true);
    });
  });
});

// Unit-level coverage of the web-pick filter itself. The integration tests above
// assert the end-to-end "no stale greeting" outcome, but the cross-platform hero
// guard backstops that outcome - so these isolate the pick-pool filter so a
// regression in it alone is caught.
describe("isGreetingEligible", () => {
  const txt = (id: QuestionCategoryId): DashboardGroupTxtQuestion => ({
    id,
    type: DashboardGroupType.TxtQuestion,
    dashboardTxt: "x",
    answers: [],
  });
  const monMorning = new Date("2024-01-15T09:00:00"); // Monday, work-day morning
  const monNight = new Date("2024-01-15T03:00:00"); // Monday, middle of the night
  const monEvening = new Date("2024-01-15T21:00:00"); // Monday evening
  const satMorning = new Date("2024-01-13T09:00:00"); // Saturday morning (weekend)

  it("excludes a morning+work-day recap at night, includes it on a work-day morning", () => {
    expect(
      isGreetingEligible(txt(QuestionCategoryId.RefocusHelperToday), monNight),
    ).toBe(false);
    expect(
      isGreetingEligible(
        txt(QuestionCategoryId.RefocusHelperToday),
        monMorning,
      ),
    ).toBe(true);
  });

  it("excludes a work-day-only recap on the weekend", () => {
    expect(
      isGreetingEligible(
        txt(QuestionCategoryId.RefocusHelperToday),
        satMorning,
      ),
    ).toBe(false);
  });

  it("excludes an evening recap in the morning, includes it in the evening", () => {
    expect(
      isGreetingEligible(txt(QuestionCategoryId.GoodToday), monMorning),
    ).toBe(false);
    expect(
      isGreetingEligible(txt(QuestionCategoryId.GoodToday), monEvening),
    ).toBe(true);
  });

  it("treats reflective self-report cards (no time window) as always eligible", () => {
    expect(
      isGreetingEligible(
        {
          id: QuestionCategoryId.XEnergyLevelToday,
          type: DashboardGroupType.EnergyLvl,
          energyLvl: 3,
        },
        monNight,
      ),
    ).toBe(true);
  });
});
