import { groupBy } from "../groupBy";

describe("groupBy", () => {
  it("groups items by a string key", () => {
    const items = [
      { name: "apple", type: "fruit" },
      { name: "banana", type: "fruit" },
      { name: "carrot", type: "vegetable" },
    ];
    const result = groupBy(items, (item) => item.type);
    expect(result).toEqual({
      fruit: [
        { name: "apple", type: "fruit" },
        { name: "banana", type: "fruit" },
      ],
      vegetable: [{ name: "carrot", type: "vegetable" }],
    });
  });

  it("groups items by a number key", () => {
    const items = [
      { id: 1, category: 1 },
      { id: 2, category: 2 },
      { id: 3, category: 1 },
    ];
    const result = groupBy(
      items,
      (item) => item.category as unknown as "1" | "2",
    );
    expect(result).toEqual({
      1: [
        { id: 1, category: 1 },
        { id: 3, category: 1 },
      ],
      2: [{ id: 2, category: 2 }],
    });
  });

  it("handles empty array", () => {
    const result = groupBy([], () => "key" as const);
    expect(result).toEqual({});
  });

  it("handles single item", () => {
    const items = [{ value: "only" }];
    const result = groupBy(items, () => "single" as const);
    expect(result).toEqual({
      single: [{ value: "only" }],
    });
  });

  it("handles all items in one group", () => {
    const items = [{ n: 1 }, { n: 2 }, { n: 3 }];
    const result = groupBy(items, () => "all" as const);
    expect(result).toEqual({
      all: [{ n: 1 }, { n: 2 }, { n: 3 }],
    });
  });

  it("preserves order within groups", () => {
    const items = ["c", "a", "b", "a", "c"];
    const result = groupBy(items, (item) => item as "a" | "b" | "c");
    expect(result["a"]).toEqual(["a", "a"]);
    expect(result["c"]).toEqual(["c", "c"]);
  });
});
