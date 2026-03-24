import { isXIn1 } from "../isXIn1";
import { mockRandom } from "@src/test-utils/mockHelpers";

describe("isXIn1", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("returns true when random is less than x", () => {
    mockRandom(0.2);
    expect(isXIn1(0.5)).toBe(true);
  });

  it("returns false when random equals x (strict greater-than)", () => {
    mockRandom(0.5);
    expect(isXIn1(0.5)).toBe(false);
  });

  it("returns false when random is greater than x", () => {
    mockRandom(0.6);
    expect(isXIn1(0.5)).toBe(false);
  });

  it("returns true for x=1 (100% chance)", () => {
    mockRandom(0.99);
    expect(isXIn1(1)).toBe(true);
  });

  it("returns false for x=0 (0% chance)", () => {
    mockRandom(0.01);
    expect(isXIn1(0)).toBe(false);
  });

  it("handles edge case random=0", () => {
    mockRandom(0);
    expect(isXIn1(0.1)).toBe(true);
  });

  it("handles fractional probabilities like 1/3", () => {
    mockRandom(0.3);
    expect(isXIn1(1 / 3)).toBe(true);

    jest.restoreAllMocks();
    mockRandom(0.4);
    expect(isXIn1(1 / 3)).toBe(false);
  });
});
