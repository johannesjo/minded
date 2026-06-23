import { updateDashboardEntriesFromQuestions } from "../updateDashboardEntries";
import {
  CENTER_INDEX,
  getDashboardEntriesFromQuestions,
} from "../getDashboardEntriesFromQuestions";
import {
  createMockSyncData,
  mockDate,
  mockRandom,
} from "@src/test-utils/mockHelpers";
import { DashboardGroup, DashboardGroupType } from "../dashboard.model";
import { QuestionCategoryId } from "@src/shared/data/questions";

jest.mock("@src/dataInterface/commonSyncDataInterface", () => ({
  IS_ANDROID: false,
  IS_APP: false,
}));

jest.mock("@src/util/isToday", () => ({
  // Let today-only / this-week-only recaps qualify so they build as tiles.
  isToday: jest.fn(() => true),
  isThisWeek: jest.fn(() => true),
}));

describe("updateDashboardEntriesFromQuestions", () => {
  beforeEach(() => {
    mockDate("2024-01-15T12:00:00");
    mockRandom(0.5);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // Mirror the view's hero-index logic (DashboardGroups.getHeroIndex).
  const greetingOf = (entries: DashboardGroup[]) =>
    entries[entries.length > CENTER_INDEX ? CENTER_INDEX : entries.length - 1];

  const isFocusHero = (entries: DashboardGroup[]): boolean => {
    const g = greetingOf(entries);
    return (
      g.type === DashboardGroupType.TxtQuestion &&
      "id" in g &&
      g.id === QuestionCategoryId.RefocusHelperToday
    );
  };

  const reflectiveAnswer = (categoryId: QuestionCategoryId, id: string) => ({
    id,
    qid: null,
    questionCategoryId: categoryId,
    val: `answer ${id}`,
    ts: Date.now(),
  });

  // Regression: the incremental merge preserves the *existing* card order and
  // only refreshes contents. A greeting that was in-window when the dashboard
  // was first built (a morning "Finding Focus Today") must not stay pinned to
  // the hero slot once its window has passed — e.g. after a night app-resume
  // refresh. The merge has to re-run the hero guard.
  it("re-guards the hero so a stale out-of-window recap can't survive a merge refresh", () => {
    const night = new Date("2024-01-15T03:00:00");
    const syncData = createMockSyncData({
      answers: [
        reflectiveAnswer(QuestionCategoryId.GoodPlansToday, "m1"),
        reflectiveAnswer(QuestionCategoryId.RefocusHelperToday, "m2"),
        reflectiveAnswer(QuestionCategoryId.GoalForTheWeek, "m3"),
        reflectiveAnswer(QuestionCategoryId.HelpfulTools, "m4"),
      ],
    });

    // A fresh night build is already guarded — the focus recap is not the hero.
    const fresh = getDashboardEntriesFromQuestions(syncData, night);
    const focusIdx = fresh.findIndex(
      (e) =>
        e.type === DashboardGroupType.TxtQuestion &&
        "id" in e &&
        e.id === QuestionCategoryId.RefocusHelperToday,
    );
    expect(focusIdx).toBeGreaterThanOrEqual(0); // focus recap is built

    // Simulate the stale arrangement from earlier in the day: same cards (so the
    // merge takes its order-preserving path), but with the focus recap pinned to
    // the hero slot.
    const stale = [...fresh];
    const [focusEntry] = stale.splice(focusIdx, 1);
    stale.splice(CENTER_INDEX, 0, focusEntry);
    // Precondition: the stale greeting really is the out-of-window focus recap.
    expect(isFocusHero(stale)).toBe(true);

    // The incremental update must NOT carry that stale greeting forward.
    const updated = updateDashboardEntriesFromQuestions(syncData, stale, night);
    expect(isFocusHero(updated)).toBe(false);

    // ...and the recap is still present for the "look back" grid.
    const stillPresent = updated.some(
      (e) =>
        e.type === DashboardGroupType.TxtQuestion &&
        "id" in e &&
        e.id === QuestionCategoryId.RefocusHelperToday,
    );
    expect(stillPresent).toBe(true);
  });

  // The flip side: while the greeting is still in-window, a merge refresh must
  // leave it alone (no needless reshuffle to a quote mid-window).
  it("keeps an in-window greeting across a merge refresh", () => {
    const morning = new Date("2024-01-15T09:00:00");
    const syncData = createMockSyncData({
      answers: [
        reflectiveAnswer(QuestionCategoryId.GoodPlansToday, "m1"),
        reflectiveAnswer(QuestionCategoryId.RefocusHelperToday, "m2"),
        reflectiveAnswer(QuestionCategoryId.GoalForTheWeek, "m3"),
        reflectiveAnswer(QuestionCategoryId.HelpfulTools, "m4"),
      ],
    });

    const fresh = getDashboardEntriesFromQuestions(syncData, morning);
    const focusIdx = fresh.findIndex(
      (e) =>
        e.type === DashboardGroupType.TxtQuestion &&
        "id" in e &&
        e.id === QuestionCategoryId.RefocusHelperToday,
    );
    const inWindow = [...fresh];
    const [focusEntry] = inWindow.splice(focusIdx, 1);
    inWindow.splice(CENTER_INDEX, 0, focusEntry);
    expect(isFocusHero(inWindow)).toBe(true);

    // Same morning time: the in-window focus greeting survives the merge.
    const updated = updateDashboardEntriesFromQuestions(
      syncData,
      inWindow,
      morning,
    );
    expect(isFocusHero(updated)).toBe(true);
  });
});
