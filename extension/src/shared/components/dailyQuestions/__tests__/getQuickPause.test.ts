import {
  getQuickPause,
  QUICK_PAUSES,
  QUICK_PAUSE_DAILY_STRIDE,
} from "@src/shared/components/dailyQuestions/getQuickPause";
import { NOTICE_CUES } from "@src/shared/components/interaction/notice/notice.const";

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));

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

  it("walks the whole pool from a fixed slot, never a fraction of it", () => {
    // A fixed slot (every morning, say) steps by the daily stride, so it only
    // covers the pool when the two are coprime. Checked against the live pool
    // size rather than trusting the arithmetic to stay true as cues come and go
    // - a stranded half would mean the morning card shows the same handful
    // forever.
    expect(gcd(QUICK_PAUSE_DAILY_STRIDE, QUICK_PAUSES.length)).toBe(1);

    const seen = new Set<string>();
    for (let i = 0; i < QUICK_PAUSES.length; i++) {
      seen.add(getQuickPause(new Date(2026, 6, 1 + i, 7, 0), "Morning").cue);
    }
    expect(seen.size).toBe(QUICK_PAUSES.length);
  });

  it("offers the NOTICE cues plus exactly one guided breath", () => {
    // The pool is the app's own interaction content, not card-only copy - the
    // one exception being the breath, which has no printed form by design.
    const known = new Set(NOTICE_CUES.map((c) => c.cue));
    const breaths = QUICK_PAUSES.filter((p) => p.kind === "breath");
    expect(breaths).toHaveLength(1);
    expect(QUICK_PAUSES.length).toBe(NOTICE_CUES.length + 1);
    for (const pause of QUICK_PAUSES) {
      if (pause.kind === "notice") expect(known.has(pause.cue)).toBe(true);
    }
  });

  it("keeps the breath out of the printed cues, where it would be a weak copy", () => {
    // A breath the app can lead beats a breath it merely names, so no NOTICE
    // cue may ask for one - that content lives on the guided surface instead.
    for (const cue of NOTICE_CUES) {
      expect(cue.cue.toLowerCase()).not.toMatch(/breath|out-breath|inhale/);
    }
  });

  it("survives a device clock set before the epoch", () => {
    // `%` keeps the dividend's sign in JS; an unnormalised index would index
    // out of the array and render `undefined` on the card.
    expect(getQuickPause(new Date(1960, 0, 1, 7, 0), "Morning")).toBeDefined();
  });
});
