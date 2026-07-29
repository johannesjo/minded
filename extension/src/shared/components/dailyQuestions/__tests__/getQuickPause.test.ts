import {
  getQuickPause,
  QUICK_PAUSES,
} from "@src/shared/components/dailyQuestions/getQuickPause";
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
    // 09:00 and 15:00 on one local day straddle the UTC date line at UTC+12,
    // so this pair is what actually discriminates: a `now.getTime() / 86400000`
    // implementation returns different days for them and fails here. Comparing
    // two evening times instead would agree under either implementation at
    // every ordinary offset, and quietly test nothing.
    const morning = getQuickPause(new Date(2026, 5, 29, 9, 0), "Morning");
    const afternoon = getQuickPause(new Date(2026, 5, 29, 15, 0), "Morning");
    expect(afternoon).toEqual(morning);
  });

  it("walks the whole pool from a fixed slot, never a fraction of it", () => {
    // Guards the property, not the constant: whatever the stride is, a morning
    // glance must eventually see every entry. A stride sharing a factor with
    // the pool size strands the rest - which is exactly what cutting two cues
    // would have done at the stride this started with.
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
