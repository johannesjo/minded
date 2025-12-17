import { isWorkDay } from "../isWorkDay";

describe("isWorkDay", () => {
  it("returns true for Monday", () => {
    const monday = new Date("2024-01-08"); // Monday
    expect(isWorkDay(monday)).toBe(true);
  });

  it("returns true for Tuesday", () => {
    const tuesday = new Date("2024-01-09");
    expect(isWorkDay(tuesday)).toBe(true);
  });

  it("returns true for Wednesday", () => {
    const wednesday = new Date("2024-01-10");
    expect(isWorkDay(wednesday)).toBe(true);
  });

  it("returns true for Thursday", () => {
    const thursday = new Date("2024-01-11");
    expect(isWorkDay(thursday)).toBe(true);
  });

  it("returns true for Friday", () => {
    const friday = new Date("2024-01-12");
    expect(isWorkDay(friday)).toBe(true);
  });

  it("returns false for Saturday", () => {
    const saturday = new Date("2024-01-13");
    expect(isWorkDay(saturday)).toBe(false);
  });

  it("returns false for Sunday", () => {
    const sunday = new Date("2024-01-14");
    expect(isWorkDay(sunday)).toBe(false);
  });
});
