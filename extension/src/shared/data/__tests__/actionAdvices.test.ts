import {
  ACTION_ADVICES,
  EVENING_ACTION_ADVICES,
} from "@src/shared/data/actionAdvices";

// The evening (wind-down) slot must never push the user toward doing a task —
// pressure to be productive at night reads as striving, the one thing the app
// avoids. This guards the data contract behind that: the evening pool is the
// full pool minus the `daytimeOnly` (task/productivity) lines.
describe("action advices", () => {
  const TASK_ADVICE =
    "Sometimes procrastination is an indicator that you actually should be doing something else than the task you are avoiding...";

  it("keeps task/productivity nudges available during the day", () => {
    expect(ACTION_ADVICES.some((a) => a.txt === TASK_ADVICE)).toBe(true);
    expect(ACTION_ADVICES.some((a) => a.daytimeOnly)).toBe(true);
  });

  it("drops every task/productivity nudge from the evening pool", () => {
    expect(EVENING_ACTION_ADVICES.every((a) => !a.daytimeOnly)).toBe(true);
    expect(EVENING_ACTION_ADVICES.some((a) => a.txt === TASK_ADVICE)).toBe(
      false,
    );
  });

  it("still leaves a real choice of calm suggestions in the evening", () => {
    expect(EVENING_ACTION_ADVICES.length).toBeGreaterThan(1);
    expect(EVENING_ACTION_ADVICES.length).toBeLessThan(ACTION_ADVICES.length);
  });
});
