import { safeJsonParse } from "../safeJsonParse";

describe("safeJsonParse", () => {
  describe("with fallback", () => {
    it("parses valid JSON and returns the data", () => {
      const result = safeJsonParse<{ name: string }>('{"name": "test"}', {
        name: "default",
      });
      expect(result).toEqual({ name: "test" });
    });

    it("returns fallback for invalid JSON", () => {
      const result = safeJsonParse<string[]>("not json", []);
      expect(result).toEqual([]);
    });

    it("returns fallback for empty string", () => {
      const result = safeJsonParse<number>("", 42);
      expect(result).toBe(42);
    });

    it("parses arrays correctly", () => {
      const result = safeJsonParse<number[]>("[1, 2, 3]", []);
      expect(result).toEqual([1, 2, 3]);
    });

    it("parses primitive values", () => {
      expect(safeJsonParse<number>("42", 0)).toBe(42);
      expect(safeJsonParse<string>('"hello"', "")).toBe("hello");
      expect(safeJsonParse<boolean>("true", false)).toBe(true);
      expect(safeJsonParse<null>("null", null)).toBe(null);
    });
  });

  describe("without fallback", () => {
    it("parses valid JSON and returns the data", () => {
      const result = safeJsonParse<{ id: number }>('{"id": 123}');
      expect(result).toEqual({ id: 123 });
    });

    it("returns undefined for invalid JSON", () => {
      const result = safeJsonParse<object>("invalid");
      expect(result).toBeUndefined();
    });

    it("returns undefined for empty string", () => {
      const result = safeJsonParse<object>("");
      expect(result).toBeUndefined();
    });
  });
});
