import { isWithinFocusHours } from "../isWithinFocusHours";
import { FocusSchedule } from "@src/dataInterface/syncData";

describe("isWithinFocusHours", () => {
  const mockSchedule: FocusSchedule = {
    enabled: true,
    days: {
      0: null, // Sunday - no blocking
      1: { start: "09:00", end: "17:00" }, // Monday
      2: { start: "09:00", end: "17:00" }, // Tuesday
      3: { start: "09:00", end: "17:00" }, // Wednesday
      4: { start: "09:00", end: "17:00" }, // Thursday
      5: { start: "09:00", end: "17:00" }, // Friday
      6: null, // Saturday - no blocking
    },
  };

  describe("schedule disabled or undefined", () => {
    it("returns true when schedule is undefined", () => {
      expect(isWithinFocusHours(undefined)).toBe(true);
    });

    it("returns true when schedule is disabled", () => {
      const disabled: FocusSchedule = { enabled: false, days: {} };
      expect(isWithinFocusHours(disabled)).toBe(true);
    });
  });

  describe("day without schedule", () => {
    it("returns false for Sunday (no schedule)", () => {
      const sunday = new Date("2024-01-07T12:00:00"); // Sunday
      expect(isWithinFocusHours(mockSchedule, sunday)).toBe(false);
    });

    it("returns false for Saturday (no schedule)", () => {
      const saturday = new Date("2024-01-13T12:00:00"); // Saturday
      expect(isWithinFocusHours(mockSchedule, saturday)).toBe(false);
    });
  });

  describe("time within range", () => {
    it("returns true at exactly start time", () => {
      const monday9am = new Date("2024-01-08T09:00:00");
      expect(isWithinFocusHours(mockSchedule, monday9am)).toBe(true);
    });

    it("returns true during work hours", () => {
      const monday12pm = new Date("2024-01-08T12:00:00");
      expect(isWithinFocusHours(mockSchedule, monday12pm)).toBe(true);
    });

    it("returns true one minute before end time", () => {
      const monday459pm = new Date("2024-01-08T16:59:00");
      expect(isWithinFocusHours(mockSchedule, monday459pm)).toBe(true);
    });
  });

  describe("time outside range", () => {
    it("returns false at exactly end time (exclusive)", () => {
      const monday5pm = new Date("2024-01-08T17:00:00");
      expect(isWithinFocusHours(mockSchedule, monday5pm)).toBe(false);
    });

    it("returns false before start time", () => {
      const monday8am = new Date("2024-01-08T08:00:00");
      expect(isWithinFocusHours(mockSchedule, monday8am)).toBe(false);
    });

    it("returns false after end time", () => {
      const monday7pm = new Date("2024-01-08T19:00:00");
      expect(isWithinFocusHours(mockSchedule, monday7pm)).toBe(false);
    });

    it("returns false at midnight", () => {
      const mondayMidnight = new Date("2024-01-08T00:00:00");
      expect(isWithinFocusHours(mondayMidnight, mondayMidnight)).toBe(false);
    });
  });

  describe("different time ranges", () => {
    it("handles early morning schedule", () => {
      const earlySchedule: FocusSchedule = {
        enabled: true,
        days: { 1: { start: "06:00", end: "08:00" } },
      };
      const monday7am = new Date("2024-01-08T07:00:00");
      expect(isWithinFocusHours(earlySchedule, monday7am)).toBe(true);
    });

    it("handles late night schedule", () => {
      const lateSchedule: FocusSchedule = {
        enabled: true,
        days: { 1: { start: "22:00", end: "23:59" } },
      };
      const monday11pm = new Date("2024-01-08T23:00:00");
      expect(isWithinFocusHours(lateSchedule, monday11pm)).toBe(true);
    });
  });

  describe("all days of week", () => {
    const fullWeekSchedule: FocusSchedule = {
      enabled: true,
      days: {
        0: { start: "10:00", end: "12:00" }, // Sunday
        1: { start: "09:00", end: "17:00" }, // Monday
        2: { start: "09:00", end: "17:00" }, // Tuesday
        3: { start: "09:00", end: "17:00" }, // Wednesday
        4: { start: "09:00", end: "17:00" }, // Thursday
        5: { start: "09:00", end: "17:00" }, // Friday
        6: { start: "10:00", end: "14:00" }, // Saturday
      },
    };

    it("works for Sunday with custom schedule", () => {
      const sunday11am = new Date("2024-01-07T11:00:00");
      expect(isWithinFocusHours(fullWeekSchedule, sunday11am)).toBe(true);
    });

    it("works for Saturday with custom schedule", () => {
      const saturday1pm = new Date("2024-01-13T13:00:00");
      expect(isWithinFocusHours(fullWeekSchedule, saturday1pm)).toBe(true);
    });
  });
});
