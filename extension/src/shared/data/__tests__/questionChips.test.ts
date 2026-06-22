import { QUESTIONS } from "@src/shared/data/questions";

// These guard the *data contract* for quick-answer chips. The chip UI submits
// the moment one is tapped, so a malformed chip set (empty, blank, duplicate)
// would silently ship a broken or confusing answer. Component rendering isn't
// unit-tested (node env), so the data is where we hold the line.
describe("question chips", () => {
  const withChips = QUESTIONS.filter((q) => q.chips !== undefined);

  it("defines chips on at least one question", () => {
    expect(withChips.length).toBeGreaterThan(0);
  });

  it("offers a real choice wherever chips are present (>= 2 options)", () => {
    for (const q of withChips) {
      expect(q.chips!.length).toBeGreaterThanOrEqual(2);
    }
  });

  it("has no blank or whitespace-only chips", () => {
    for (const q of withChips) {
      for (const chip of q.chips!) {
        expect(chip.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it("has no duplicate chips within a question", () => {
    for (const q of withChips) {
      const normalized = q.chips!.map((c) => c.trim().toLowerCase());
      expect(new Set(normalized).size).toBe(normalized.length);
    }
  });

  it("composes cleanly with a prompt prefix when one is set", () => {
    // Mirrors Question.tsx's submitChip: prompt + " " + chip. The result must
    // stay within the input's 500-char cap and read as one sentence fragment.
    for (const q of withChips) {
      if (!q.prompt) continue;
      for (const chip of q.chips!) {
        const composed = `${q.prompt} ${chip}`;
        expect(composed.length).toBeLessThanOrEqual(500);
        expect(composed).toContain(q.prompt);
      }
    }
  });
});
