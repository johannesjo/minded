import {
  getActiveInterventionPause,
  getSkipCheckInUpdate,
  getSkipUpdateAfterSkip,
  INTERVENTION_PAUSE_MS,
  isInterventionPauseActive,
  isSkipCheckInDue,
  SKIP_CHECK_IN_CHOICES,
  SKIP_CHECK_IN_OBSERVATION,
  SKIP_CHECK_IN_QUESTION,
  SKIP_CHECK_IN_THRESHOLD,
  SKIP_STREAK_MAX_GAP_MS,
} from "./skipCheckIn";

const NOW = new Date("2026-05-11T10:00:00").getTime();
const LATER_WEEK = { kind: "later" as const, untilTS: NOW + 1000 };

describe("skipCheckIn", () => {
  const DAY = 24 * 60 * 60 * 1000;
  const recent = { lastSkipTS: NOW - 1000 };

  describe("isSkipCheckInDue", () => {
    it("is due from the threshold on, not before", () => {
      expect(SKIP_CHECK_IN_THRESHOLD).toBe(10);
      expect(isSkipCheckInDue({ skipStreak: 9, ...recent }, NOW)).toBe(false);
      expect(isSkipCheckInDue({ skipStreak: 10, ...recent }, NOW)).toBe(true);
      expect(isSkipCheckInDue({ skipStreak: 14, ...recent }, NOW)).toBe(true);
    });

    it("treats a missing streak (fresh or older data) as none", () => {
      expect(isSkipCheckInDue({}, NOW)).toBe(false);
    });

    it("only says 'lately' when the last pass was recent", () => {
      expect(SKIP_STREAK_MAX_GAP_MS).toBe(3 * DAY);
      expect(
        isSkipCheckInDue({ skipStreak: 10, lastSkipTS: NOW - 3 * DAY }, NOW),
      ).toBe(true);
      expect(
        isSkipCheckInDue(
          { skipStreak: 10, lastSkipTS: NOW - 3 * DAY - 1 },
          NOW,
        ),
      ).toBe(false);
      expect(isSkipCheckInDue({ skipStreak: 10 }, NOW)).toBe(false);
    });

    it("waits while any answer stands - 'as it does now' included", () => {
      for (const kind of ["as_now", "later", "off"] as const) {
        expect(
          isSkipCheckInDue(
            {
              skipStreak: 10,
              ...recent,
              interventionPause: { kind, untilTS: NOW + 1000 },
            },
            NOW,
          ),
        ).toBe(false);
      }
      expect(
        isSkipCheckInDue(
          { skipStreak: 10, ...recent, interventionPause: LATER_WEEK },
          LATER_WEEK.untilTS,
        ),
      ).toBe(true);
    });
  });

  describe("getSkipUpdateAfterSkip", () => {
    it("counts one more pass and remembers when", () => {
      expect(getSkipUpdateAfterSkip({}, NOW)).toEqual({
        skipStreak: 1,
        lastSkipTS: NOW,
      });
      expect(getSkipUpdateAfterSkip({ skipStreak: 4, ...recent }, NOW)).toEqual(
        { skipStreak: 5, lastSkipTS: NOW },
      );
    });

    it("starts over after a long gap - those passes aren't 'lately'", () => {
      expect(
        getSkipUpdateAfterSkip(
          { skipStreak: 9, lastSkipTS: NOW - 3 * DAY - 1 },
          NOW,
        ),
      ).toEqual({ skipStreak: 1, lastSkipTS: NOW });
    });

    it("never counts at bedtime, where the check-in can't ask", () => {
      const NIGHT = { start: "22:00", end: "07:00" };
      const cfg = {
        sleepWindDown: {
          enabled: true,
          days: {
            0: NIGHT,
            1: NIGHT,
            2: NIGHT,
            3: NIGHT,
            4: NIGHT,
            5: NIGHT,
            6: NIGHT,
          },
        },
      };
      const late = new Date("2026-05-11T23:00:00").getTime();
      expect(getSkipUpdateAfterSkip({ skipStreak: 3, cfg }, late)).toBeNull();
      // The same settings leave the daytime alone.
      expect(getSkipUpdateAfterSkip({ skipStreak: 3, cfg }, NOW)).toEqual({
        skipStreak: 1,
        lastSkipTS: NOW,
      });
    });

    it("changes nothing while an answer stands", () => {
      expect(
        getSkipUpdateAfterSkip(
          { skipStreak: 0, interventionPause: LATER_WEEK },
          NOW,
        ),
      ).toBeNull();
    });
  });

  describe("getSkipCheckInUpdate", () => {
    it("starts the count over, and every answer stands for a week", () => {
      expect(INTERVENTION_PAUSE_MS).toBe(7 * DAY);
      for (const choice of ["as_now", "later", "off"] as const) {
        expect(getSkipCheckInUpdate(choice, NOW)).toEqual({
          skipStreak: 0,
          interventionPause: {
            kind: choice,
            untilTS: NOW + INTERVENTION_PAUSE_MS,
          },
        });
      }
    });
  });

  describe("getActiveInterventionPause", () => {
    it("returns the week only while it stands", () => {
      expect(
        getActiveInterventionPause({ interventionPause: LATER_WEEK }, NOW),
      ).toEqual(LATER_WEEK);
      expect(
        getActiveInterventionPause(
          { interventionPause: LATER_WEEK },
          LATER_WEEK.untilTS,
        ),
      ).toBeUndefined();
      expect(getActiveInterventionPause({}, NOW)).toBeUndefined();
      expect(
        getActiveInterventionPause({ interventionPause: null }, NOW),
      ).toBeUndefined();
    });

    it("tells the two kinds apart", () => {
      const syncData = { interventionPause: LATER_WEEK };
      expect(isInterventionPauseActive(syncData, "later", NOW)).toBe(true);
      expect(isInterventionPauseActive(syncData, "off", NOW)).toBe(false);
    });
  });

  describe("copy", () => {
    const allCopy = [
      SKIP_CHECK_IN_OBSERVATION,
      SKIP_CHECK_IN_QUESTION,
      ...SKIP_CHECK_IN_CHOICES.map((c) => c.label),
    ];

    it("never names a count - it says what happened, not how often", () => {
      for (const line of allCopy) {
        expect(line).not.toMatch(/\d/);
      }
    });

    it("never guesses at the user or talks about the app", () => {
      for (const line of allCopy) {
        expect(line).not.toMatch(/seem|minded|skipp|ignor|need/i);
      }
    });

    it("never calls continuing into the app 'going in'", () => {
      for (const line of allCopy) {
        expect(line).not.toMatch(/\bgo(es|ing)?\b.*\bin\b/i);
      }
    });

    it("offers exactly the three choices, the everyday one first", () => {
      expect(SKIP_CHECK_IN_CHOICES.map((c) => c.choice)).toEqual([
        "as_now",
        "later",
        "off",
      ]);
    });
  });
});
