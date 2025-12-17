import { truncate } from "../truncate";

describe("truncate", () => {
  it("returns the original string when shorter than maxLength", () => {
    expect(truncate("hello", 10)).toBe("hello");
  });

  it("returns the original string when equal to maxLength", () => {
    expect(truncate("hello", 5)).toBe("hello");
  });

  it("truncates and adds ellipsis when longer than maxLength", () => {
    expect(truncate("hello world", 6)).toBe("hello…");
  });

  it("handles empty string", () => {
    expect(truncate("", 5)).toBe("");
  });

  it("handles maxLength of 1", () => {
    expect(truncate("hello", 1)).toBe("…");
  });

  it("handles maxLength of 2", () => {
    expect(truncate("hello", 2)).toBe("h…");
  });

  it("returns falsy value as-is", () => {
    // @ts-expect-error testing edge case with null
    expect(truncate(null, 5)).toBe(null);
    // @ts-expect-error testing edge case with undefined
    expect(truncate(undefined, 5)).toBe(undefined);
  });
});
