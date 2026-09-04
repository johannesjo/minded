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
  it("says when a big copy was cut to what this browser holds", () => {
    expect(describeImport(5, 0, true)).toBe(
      "Added 5 answers. This browser keeps only the most recent answers, so the older ones in that copy didn't fit.",
    );
    expect(describeImport(0, 0, true)).toBe(
      "Added none. This browser keeps only the most recent answers, so the older ones in that copy didn't fit.",
    );
  });
});
