import { daySkyAt, NIGHT_END_HOUR, NIGHT_START_HOUR } from "../skyTimeline";
import {
  clockSkyMoment,
  NIGHT_ELEVATION,
  nightWindowsFrom,
  skyMomentAt,
} from "./solarSky";
import { solarPositionAt } from "./solarPosition";
import { currentTimeZone, locationForTimeZone } from "./timeZoneLocation";

const BERLIN = locationForTimeZone("Europe/Berlin")!;
const SINGAPORE = locationForTimeZone("Asia/Singapore")!;
const SVALBARD = locationForTimeZone("Arctic/Longyearbyen")!;
const at = (iso: string) => new Date(iso);
const MIN = 60_000;

/** Every minute of the UTC day starting at `isoDay`. */
const minutesOf = (isoDay: string): Date[] => {
  const start = new Date(`${isoDay}T00:00:00Z`).getTime();
  return Array.from({ length: 24 * 60 }, (_, i) => new Date(start + i * MIN));
};

const hexDist = (a: string, b: string): number => {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  return Math.max(
    ...[16, 8, 0].map((s) => Math.abs(((pa >> s) & 0xff) - ((pb >> s) & 0xff))),
  );
};

describe("locationForTimeZone", () => {
  it("knows canonical and legacy zone names", () => {
    expect(BERLIN).toEqual({ lat: 53, lon: 13 });
    expect(locationForTimeZone("Asia/Calcutta")).toEqual(
      locationForTimeZone("Asia/Kolkata"),
    );
    expect(locationForTimeZone("US/Eastern")).toEqual(
      locationForTimeZone("America/New_York"),
    );
  });

  it("returns null for zones with no place: UTC, Etc/*, unknown", () => {
    expect(locationForTimeZone("UTC")).toBeNull();
    expect(locationForTimeZone("Etc/GMT+3")).toBeNull();
    expect(locationForTimeZone("Mars/Olympus_Mons")).toBeNull();
    expect(locationForTimeZone(null)).toBeNull();
    expect(locationForTimeZone("")).toBeNull();
  });

  it("reads the runtime zone", () => {
    // jest pins Pacific/Honolulu (jest.globalSetup.js).
    expect(currentTimeZone()).toBe("Pacific/Honolulu");
    expect(locationForTimeZone(currentTimeZone())).not.toBeNull();
  });
});

describe("skyMomentAt - Berlin, June vs December", () => {
  it("keeps a June 20:30 (CEST) evening light - the old clock called it night", () => {
    const m = skyMomentAt(at("2026-06-21T18:30:00Z"), BERLIN);
    expect(m.isNight).toBe(false);
    expect(m.source).toBe("sun");
    // ...and it is golden hour: well into the afternoon→dusk stretch.
    expect(m.hour).toBeGreaterThan(17);
    expect(m.hour).toBeLessThan(NIGHT_START_HOUR);
  });

  it("brings June night at blue hour, ~22:05 CEST", () => {
    expect(skyMomentAt(at("2026-06-21T19:55:00Z"), BERLIN).isNight).toBe(false);
    expect(skyMomentAt(at("2026-06-21T20:20:00Z"), BERLIN).isNight).toBe(true);
  });

  it("never reaches true night in a Berlin midsummer - not every star comes out", () => {
    const depths = minutesOf("2026-06-21").map(
      (d) => skyMomentAt(d, BERLIN).starDepth,
    );
    expect(Math.max(...depths)).toBeGreaterThan(0.5);
    expect(Math.max(...depths)).toBeLessThan(1);
  });

  it("makes a December 17:00 (CET) evening night - the old clock called it day", () => {
    const m = skyMomentAt(at("2026-12-21T16:00:00Z"), BERLIN);
    expect(m.isNight).toBe(true);
    expect(m.afterglow).toBeGreaterThan(0);
  });

  it("reaches the full star field and drains the afterglow in a December night", () => {
    const m = skyMomentAt(at("2026-12-21T22:00:00Z"), BERLIN);
    expect(m.starDepth).toBe(1);
    expect(m.afterglow).toBe(0);
  });

  it("starts night exactly where the sun sinks past NIGHT_ELEVATION", () => {
    for (const d of minutesOf("2026-03-20")) {
      const { elevation } = solarPositionAt(d, BERLIN.lat, BERLIN.lon);
      expect(skyMomentAt(d, BERLIN).isNight).toBe(elevation < NIGHT_ELEVATION);
    }
  });

  it("puts midday at solar noon and the night edges on dawn/dusk", () => {
    expect(skyMomentAt(at("2026-06-21T11:08:00Z"), BERLIN).hour).toBeCloseTo(
      13,
      0,
    );
    const nights = nightWindowsFrom(at("2026-06-21T12:00:00Z"), BERLIN, 24);
    expect(nights).toHaveLength(1);
    const [start, end] = nights[0];
    // Night is short in June: ~22:10 → ~04:50 CEST.
    expect((end - start) / 3_600_000).toBeGreaterThan(6);
    expect((end - start) / 3_600_000).toBeLessThan(7.5);
    expect(skyMomentAt(new Date(start - MIN * 10), BERLIN).hour).toBeCloseTo(
      NIGHT_START_HOUR,
      0,
    );
    expect(skyMomentAt(new Date(end + MIN * 10), BERLIN).hour).toBeCloseTo(
      NIGHT_END_HOUR,
      0,
    );
  });

  it("never jumps: the light sky changes by at most a hair per minute", () => {
    for (const day of ["2026-06-21", "2026-12-21", "2026-03-20"]) {
      let prev: ReturnType<typeof daySkyAt> | null = null;
      for (const d of minutesOf(day)) {
        const m = skyMomentAt(d, BERLIN);
        if (m.isNight) {
          prev = null;
          continue;
        }
        const sky = daySkyAt(m.hour, m.blend);
        if (prev) {
          for (let i = 0; i < 4; i++) {
            expect(hexDist(prev.colors[i], sky.colors[i])).toBeLessThanOrEqual(
              2,
            );
          }
        }
        prev = sky;
      }
    }
  });
});

describe("skyMomentAt - equatorial", () => {
  it("keeps the same ~11.5h night the whole year in Singapore", () => {
    const nightHours = ["2026-06-21", "2026-12-21"].map((day) => {
      const nights = nightWindowsFrom(at(`${day}T06:00:00Z`), SINGAPORE, 24);
      expect(nights).toHaveLength(1);
      return (nights[0][1] - nights[0][0]) / 3_600_000;
    });
    for (const h of nightHours) {
      expect(h).toBeGreaterThan(10.5);
      expect(h).toBeLessThan(12);
    }
    expect(Math.abs(nightHours[0] - nightHours[1])).toBeLessThan(0.5);
  });

  it("darkens fast: true night ~1h15 after the night boundary", () => {
    // 20:45 local (UTC+8) is deep into an equatorial night.
    expect(skyMomentAt(at("2026-03-20T12:45:00Z"), SINGAPORE).starDepth).toBe(
      1,
    );
  });
});

describe("skyMomentAt - polar", () => {
  it("never makes night under the midnight sun, and stays calm through it", () => {
    let prev: ReturnType<typeof daySkyAt> | null = null;
    let sawBlend = false;
    for (const d of minutesOf("2026-06-21")) {
      const m = skyMomentAt(d, SVALBARD);
      expect(m.isNight).toBe(false);
      expect(m.starDepth).toBe(0);
      if (m.blend) sawBlend = true;
      const sky = daySkyAt(m.hour, m.blend);
      if (prev) {
        for (let i = 0; i < 4; i++) {
          expect(hexDist(prev.colors[i], sky.colors[i])).toBeLessThanOrEqual(2);
        }
      }
      prev = sky;
    }
    // Around solar midnight the dusk side eases into the dawn side.
    expect(sawBlend).toBe(true);
  });

  it("keeps night all day in the polar night", () => {
    for (const d of minutesOf("2026-12-21")) {
      expect(skyMomentAt(d, SVALBARD).isNight).toBe(true);
    }
  });

  it("flags the southern hemisphere (the moon waxes from the left there)", () => {
    const sydney = locationForTimeZone("Australia/Sydney");
    expect(
      skyMomentAt(at("2026-06-21T12:00:00Z"), sydney).isSouthernHemisphere,
    ).toBe(true);
    expect(
      skyMomentAt(at("2026-06-21T12:00:00Z"), BERLIN).isSouthernHemisphere,
    ).toBe(false);
  });
});

describe("skyMomentAt - unknown zone falls back to the fixed clock", () => {
  it("is night 19:00-06:00 local, day otherwise, by the wall clock", () => {
    const local = (h: number, m = 0) => new Date(2026, 5, 21, h, m);
    expect(skyMomentAt(local(18, 59), null).isNight).toBe(false);
    expect(skyMomentAt(local(19), null).isNight).toBe(true);
    expect(skyMomentAt(local(5, 59), null).isNight).toBe(true);
    expect(skyMomentAt(local(6), null).isNight).toBe(false);
    const m = skyMomentAt(local(13, 30), null);
    expect(m.source).toBe("clock");
    expect(m.hour).toBe(13.5);
    expect(m.blend).toBeNull();
  });

  it("keeps the old afterglow and the full star field at night", () => {
    const m = clockSkyMoment(20, new Date());
    expect(m.afterglow).toBeCloseTo(0.5);
    expect(m.starDepth).toBe(1);
  });
});
