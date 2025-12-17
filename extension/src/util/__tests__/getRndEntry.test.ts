import { getRndEntry, getRndIndex } from "../getRndEntry";
import { mockRandom } from "@src/test-utils/mockHelpers";

describe("getRndEntry", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("returns first element when random is 0", () => {
    mockRandom(0);
    expect(getRndEntry(["a", "b", "c"])).toBe("a");
  });

  it("returns last element when random is close to 1", () => {
    mockRandom(0.99);
    expect(getRndEntry(["a", "b", "c"])).toBe("c");
  });

  it("returns middle element with appropriate random value", () => {
    mockRandom(0.5);
    expect(getRndEntry(["a", "b", "c"])).toBe("b");
  });

  it("works with single element array", () => {
    mockRandom(0.5);
    expect(getRndEntry(["only"])).toBe("only");
  });

  it("works with objects", () => {
    mockRandom(0);
    const items = [{ id: 1 }, { id: 2 }];
    expect(getRndEntry(items)).toEqual({ id: 1 });
  });

  it("works with numbers", () => {
    mockRandom(0.7);
    expect(getRndEntry([10, 20, 30])).toBe(30);
  });
});

describe("getRndIndex", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("returns 0 when random is 0", () => {
    mockRandom(0);
    expect(getRndIndex(["a", "b", "c"])).toBe(0);
  });

  it("returns last index when random is close to 1", () => {
    mockRandom(0.99);
    expect(getRndIndex(["a", "b", "c"])).toBe(2);
  });

  it("returns middle index with appropriate random value", () => {
    mockRandom(0.5);
    expect(getRndIndex(["a", "b", "c"])).toBe(1);
  });

  it("returns 0 for single element array", () => {
    mockRandom(0.5);
    expect(getRndIndex(["only"])).toBe(0);
  });
});
