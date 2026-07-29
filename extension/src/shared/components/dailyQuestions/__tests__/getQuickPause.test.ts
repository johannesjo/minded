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

  it("puts the evening's practice half a pool away from the morning's", () => {
    // Not merely "different": adjacent entries would make the two ends of a day
    // read as one batch, which is the same complaint the interleave fixes.
    const day = [2026, 6, 29] as const;
    const morning = getQuickPause(new Date(...day, 7, 0), "Morning");
    const evening = getQuickPause(new Date(...day, 7, 0), "Evening");
    expect(evening).not.toEqual(morning);
    const gap = Math.abs(
      QUICK_PAUSES.indexOf(evening) - QUICK_PAUSES.indexOf(morning),
    );
    expect(Math.min(gap, QUICK_PAUSES.length - gap)).toBeGreaterThan(1);
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

  it("offers exactly the NOTICE cues - nothing that leaves the card", () => {
    // The pool is the app's own interaction content, not card-only copy - and
    // every offer completes where you stand. The guided breath used to be the
    // one entry whose button navigated away (/quickBreath); it was cut, so a
    // reappearing off-card offer is a regression, not an addition.
    const known = new Set(NOTICE_CUES.map((c) => c.cue));
    expect(QUICK_PAUSES.length).toBe(NOTICE_CUES.length);
    for (const pause of QUICK_PAUSES) {
      expect(known.has(pause.cue)).toBe(true);
    }
  });

  it("keeps the breath out of the printed cues, where it would be a weak copy", () => {
    // A breath the app can lead beats a breath it merely names, so no NOTICE
    // cue may ask for one - that practice belongs to the sun-led guided pauses
    // (the strong-friction intervention), not to printed text.
    for (const cue of NOTICE_CUES) {
      expect(cue.cue.toLowerCase()).not.toMatch(/breath|out-breath|inhale/);
    }
  });

  it("survives a device clock set before the epoch", () => {
    // `%` keeps the dividend's sign in JS; an unnormalised index would read off
    // the front of the array and render `undefined` on the card. Both modes,
    // because the evening offset shifts the index further negative - and
    // `toContain`, not `toBeDefined`, since a negative index into an array of
    // objects is `undefined` only sometimes (it depends on the pool size, which
    // once made this assertion pass by arithmetic accident).
    const preEpoch = new Date(1960, 0, 1, 7, 0);
    expect(QUICK_PAUSES).toContain(getQuickPause(preEpoch, "Morning"));
    expect(QUICK_PAUSES).toContain(getQuickPause(preEpoch, "Evening"));
  });

  it("counts one calendar day at a time, even across a DST change", () => {
    // Dividing a local-midnight timestamp by a fixed 86,400,000 assumes every
    // day is 24h. Near UTC (London/Lisbon) that repeats an index the day after
    // the spring change and skips one after the autumn change - a morning that
    // says exactly what yesterday said. Date parts have no such gap.
    const marchDays = [27, 28, 29, 30, 31].map((d) =>
      getQuickPause(new Date(2027, 2, d, 9, 0), "Morning"),
    );
    expect(new Set(marchDays).size).toBe(marchDays.length);
    const octoberDays = [29, 30, 31].map((d) =>
      getQuickPause(new Date(2027, 9, d, 9, 0), "Morning"),
    );
    expect(new Set(octoberDays).size).toBe(octoberDays.length);
  });

  it("keeps thematic batches off consecutive mornings", () => {
    // The offer advances one entry per day, so the array order IS the order
    // mornings arrive in - and cues are authored in batches. Without the
    // interleave the batch added together surfaces on consecutive mornings.
    const authored = NOTICE_CUES.map((c) => c.cue);
    const rotated = QUICK_PAUSES.map((p) => p.cue);
    expect(new Set(rotated)).toEqual(new Set(authored));
    const authoredNeighbours = authored.filter(
      (cue, i) =>
        i > 0 &&
        Math.abs(rotated.indexOf(cue) - rotated.indexOf(authored[i - 1])) === 1,
    );
    expect(authoredNeighbours.length).toBeLessThan(authored.length / 2);
  });

  it("runs at an offset that can actually see a local-vs-UTC mistake", () => {
    // The midnight test above is only meaningful at a large negative offset;
    // pinned in jest.globalSetup.js. If the pin ever silently stops applying,
    // Node falls back to UTC and that test passes without testing anything.
    expect(new Date(2026, 5, 29, 9, 0).getTimezoneOffset()).toBe(600);
  });
});
