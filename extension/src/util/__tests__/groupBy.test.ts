import { groupBy } from "../groupBy";

describe("groupBy", () => {
  it("groups items by a string key", () => {
    const items = [
      { name: "apple", type: "fruit" },
      { name: "banana", type: "fruit" },
      { name: "carrot", type: "vegetable" },
    ];
    // Use type assertion to work with the generic constraint
    const result = groupBy(items, (item) => item.type as keyof object);
    expect(result).toEqual({
      fruit: [
        { name: "apple", type: "fruit" },
        { name: "banana", type: "fruit" },
      ],
      vegetable: [{ name: "carrot", type: "vegetable" }],
    });
  });

  it("groups items by a derived key", () => {
    const items = [
      { id: 1, category: 1 },
      { id: 2, category: 2 },
      { id: 3, category: 1 },
    ];
    const result = groupBy(
      items,
      (item) => String(item.category) as keyof object,
    );
    expect(result).toEqual({
      "1": [
        { id: 1, category: 1 },
        { id: 3, category: 1 },
      ],
      "2": [{ id: 2, category: 2 }],
    });
  });

  it("handles empty array", () => {
    const result = groupBy(
      [] as { value: string }[],
      () => "key" as keyof object,
    );
    expect(result).toEqual({});
  });

  it("handles single item", () => {
    const items = [{ value: "only" }];
    const result = groupBy(items, () => "single" as keyof object);
    expect(result).toEqual({
      single: [{ value: "only" }],
    });
  });

  it("handles all items in one group", () => {
    const items = [{ n: 1 }, { n: 2 }, { n: 3 }];
    const result = groupBy(items, () => "all" as keyof object);
    expect(result).toEqual({
      all: [{ n: 1 }, { n: 2 }, { n: 3 }],
    });
  });

  it("preserves order within groups", () => {
    const items = ["c", "a", "b", "a", "c"];
    const result = groupBy(items, (item) => item as keyof object);
    expect(result["a" as keyof typeof result]).toEqual(["a", "a"]);
    expect(result["c" as keyof typeof result]).toEqual(["c", "c"]);
  });
});
