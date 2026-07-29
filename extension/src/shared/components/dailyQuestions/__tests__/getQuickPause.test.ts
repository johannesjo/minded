import { getQuickPause } from "@src/shared/components/dailyQuestions/getQuickPause";
import { NOTICE_CUES } from "@src/shared/components/interaction/notice/notice.const";

describe("the daily-questions card's quick pause", () => {
  it("holds still across a day, so a re-render never reshuffles the card", () => {
    // The dashboard re-runs refresh() on plenty of events; a line that changed
    // under someone mid-read would make a calm card feel like a slot machine.
    const morning = getQuickPause(new Date(2026, 6, 29, 7, 15), "Morning");
    const laterThatMorning = getQuickPause(
      new Date(2026, 6, 29, 11, 42),
      "Morning",
    );
    expect(laterThatMorning).toEqual(morning);
  });

  it("gives the evening a different practice than the morning of the same day", () => {
    const day = [2026, 6, 29] as const;
    expect(getQuickPause(new Date(...day, 7, 0), "Evening")).not.toEqual(
      getQuickPause(new Date(...day, 7, 0), "Morning"),
    );
  });

  it("moves on with the day", () => {
    expect(getQuickPause(new Date(2026, 6, 30, 7, 0), "Morning")).not.toEqual(
      getQuickPause(new Date(2026, 6, 29, 7, 0), "Morning"),
    );
  });

  it("turns over at local midnight, not UTC's", () => {
    // Late-evening and just-past-midnight local times sit in different UTC days
    // for a good part of the world; the card must follow the user's day.
    const lateEvening = getQuickPause(new Date(2026, 6, 29, 23, 30), "Evening");
    const sameEveningEarlier = getQuickPause(
      new Date(2026, 6, 29, 20, 5),
      "Evening",
    );
    expect(lateEvening).toEqual(sameEveningEarlier);
  });

  it("walks the whole pool from a fixed slot, never half of it", () => {
    // Stride 2 per day (morning, then evening) only covers the pool when its
    // size is coprime with 2 - i.e. odd. An even pool would strand every other
    // cue, so the morning card would show the same handful forever.
    expect(NOTICE_CUES.length % 2).toBe(1);

    const seen = new Set<string>();
    for (let i = 0; i < NOTICE_CUES.length; i++) {
      seen.add(getQuickPause(new Date(2026, 6, 1 + i, 7, 0), "Morning").cue);
    }
    expect(seen.size).toBe(NOTICE_CUES.length);
  });

  it("only ever offers a real NOTICE cue, so nothing here is card-only content", () => {
    const known = new Set(NOTICE_CUES.map((c) => c.cue));
    for (let i = 0; i < 40; i++) {
      const date = new Date(2026, 0, 1 + i, 7, 0);
      expect(known.has(getQuickPause(date, "Morning").cue)).toBe(true);
      expect(known.has(getQuickPause(date, "Evening").cue)).toBe(true);
    }
  });

  it("survives a device clock set before the epoch", () => {
    // `%` keeps the dividend's sign in JS; an unnormalised index would index
    // out of the array and render `undefined` on the card.
    expect(getQuickPause(new Date(1960, 0, 1, 7, 0), "Morning")).toBeDefined();
  });
});
