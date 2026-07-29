import { isWorkDay } from "../isWorkDay";

// Local dates, built from parts. A date *string* ("2024-01-08") parses as UTC
// midnight, which is the previous day locally at every negative offset - so
// these tests used to call Monday a Sunday, and Saturday a Friday, for anyone
// running them west of UTC. `isWorkDay` reads getDay(), which is local.
describe("isWorkDay", () => {
  it("returns true for Monday", () => {
    const monday = new Date(2024, 0, 8); // Monday
    expect(isWorkDay(monday)).toBe(true);
  });

  it("returns true for Tuesday", () => {
    const tuesday = new Date(2024, 0, 9);
    expect(isWorkDay(tuesday)).toBe(true);
  });

  it("returns true for Wednesday", () => {
    const wednesday = new Date(2024, 0, 10);
    expect(isWorkDay(wednesday)).toBe(true);
  });

  it("returns true for Thursday", () => {
    const thursday = new Date(2024, 0, 11);
    expect(isWorkDay(thursday)).toBe(true);
  });

  it("returns true for Friday", () => {
    const friday = new Date(2024, 0, 12);
    expect(isWorkDay(friday)).toBe(true);
  });

  it("returns false for Saturday", () => {
    const saturday = new Date(2024, 0, 13);
    expect(isWorkDay(saturday)).toBe(false);
  });

  it("returns false for Sunday", () => {
    const sunday = new Date(2024, 0, 14);
    expect(isWorkDay(sunday)).toBe(false);
  });
});
