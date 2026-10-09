import {
  midnightElevation,
  noonElevation,
  solarPositionAt,
} from "./solarPosition";

// Berlin's real sunrise/sunset (timeanddate.com, 2026): June 21 sets 21:33
// CEST (19:33 UTC); December 21 sets 15:54 CET (14:54 UTC). Official sunset is
// the centre 0.833° below the horizon (refraction + radius).
const BERLIN = { lat: 52.52, lon: 13.4 };
const el = (iso: string, at = BERLIN) =>
  solarPositionAt(new Date(iso), at.lat, at.lon).elevation;

describe("solarPositionAt", () => {
  it("puts Berlin's midsummer sunset at ~21:33 CEST", () => {
    expect(el("2026-06-21T19:23:00Z")).toBeGreaterThan(-0.833);
    expect(el("2026-06-21T19:43:00Z")).toBeLessThan(-0.833);
  });

  it("puts Berlin's midwinter sunset at ~15:54 CET", () => {
    expect(el("2026-12-21T14:44:00Z")).toBeGreaterThan(-0.833);
    expect(el("2026-12-21T15:04:00Z")).toBeLessThan(-0.833);
  });

  it("peaks at the textbook noon height (90 - |lat - declination|)", () => {
    // Berlin solar noon ~ 11:07 UTC in June.
    const pos = solarPositionAt(new Date("2026-06-21T11:07:00Z"), 52.52, 13.4);
    expect(pos.elevation).toBeCloseTo(60.9, 0);
    expect(noonElevation(52.52, pos.declination)).toBeCloseTo(60.9, 0);
    expect(Math.abs(pos.hourAngle)).toBeLessThan(2);
  });

  it("signs the hour angle: negative mornings, positive afternoons", () => {
    const morning = solarPositionAt(
      new Date("2026-03-20T07:00:00Z"),
      BERLIN.lat,
      BERLIN.lon,
    );
    const afternoon = solarPositionAt(
      new Date("2026-03-20T15:00:00Z"),
      BERLIN.lat,
      BERLIN.lon,
    );
    expect(morning.hourAngle).toBeLessThan(0);
    expect(afternoon.hourAngle).toBeGreaterThan(0);
  });

  it("knows the midnight sun never sets at 78°N in June", () => {
    const { declination } = solarPositionAt(
      new Date("2026-06-21T12:00:00Z"),
      78,
      16,
    );
    expect(midnightElevation(78, declination)).toBeGreaterThan(10);
    for (let h = 0; h < 24; h++) {
      const iso = `2026-06-21T${String(h).padStart(2, "0")}:00:00Z`;
      expect(el(iso, { lat: 78, lon: 16 })).toBeGreaterThan(10);
    }
  });
});
