import { QUESTIONS } from "@src/shared/data/questions";
import { QID } from "@src/shared/data/questionId";

// Guards the data contract for the supportive off-ramp (Question.tsx
// runSupportiveExit). A question with `supportiveResponse` routes a tapped chip
// to a calm exit instead of the choose-a-session flow, so the pairing it relies
// on must hold. Component rendering isn't unit-tested (node env), so the data is
// where we hold the line.
describe("supportiveResponse questions", () => {
  const withSupportive = QUESTIONS.filter(
    (q) => q.supportiveResponse !== undefined,
  );

  it("exists on at least one question", () => {
    expect(withSupportive.length).toBeGreaterThan(0);
  });

  it("only pairs with chips + isDontSaveAnswer", () => {
    // The off-ramp is triggered by a tapped chip, and naming a depleted state
    // must leave no record — so both are required wherever supportiveResponse
    // is set (see the field's doc-comment in questions.ts).
    for (const q of withSupportive) {
      expect(q.chips?.length ?? 0).toBeGreaterThanOrEqual(2);
      expect(q.isDontSaveAnswer).toBe(true);
    }
  });

  it("has a non-blank, single-line message", () => {
    for (const q of withSupportive) {
      expect(q.supportiveResponse!.trim().length).toBeGreaterThan(0);
      expect(q.supportiveResponse!).not.toContain("\n");
    }
  });

  it("UP8 carries the full present-moment contract", () => {
    const up8 = QUESTIONS.find((q) => q.id === QID.UP8);
    expect(up8).toBeDefined();
    expect(up8!.chips?.length).toBeGreaterThanOrEqual(2);
    expect(up8!.supportiveResponse).toBeTruthy();
    expect(up8!.isDontSaveAnswer).toBe(true);
    expect(up8!.isSkipOnDashboard).toBe(true);
  });
});
