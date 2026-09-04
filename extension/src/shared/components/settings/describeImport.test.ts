import { describeImport } from "@src/shared/components/settings/describeImport";

describe("describeImport", () => {
  it("says when nothing was new", () => {
    expect(describeImport(0, 0)).toBe(
      "Everything in that copy is already here.",
    );
  });
  it("counts answers and questions, singular and plural", () => {
    expect(describeImport(1, 0)).toBe("Added 1 answer.");
    expect(describeImport(12, 2)).toBe("Added 12 answers and 2 questions.");
    expect(describeImport(0, 1)).toBe("Added 1 question.");
  });
});
