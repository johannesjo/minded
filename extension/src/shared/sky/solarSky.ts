import {
  AMBIENT_SKY_KEYFRAMES,
  NIGHT_END_HOUR,
  NIGHT_START_HOUR,
  nightAfterglowAt,
} from "@src/shared/skyTimeline";
import { moonPhaseAt, type MoonPhase } from "./lunarPhase";
import {
  midnightElevation,
  noonElevation,
  solarPositionAt,
} from "./solarPosition";
import type { LatLon } from "./timeZoneLocation";

/**
 * The true sky: what the present moment's light actually is, from the date and
 * an approximate position (timeZoneLocation.ts).
 *
 * skyTimeline.ts holds the palette - pastel keyframes on a fixed clock that
 * was only ever right around the equinox (night at 19:00 is broad daylight in
 * a Berlin June and an hour after dark in its December). This module keeps
 * that palette and re-times it to the sun: every keyframe is pinned to a solar
 * elevation instead of an hour, and the result is expressed back on the
 * palette's own clock (`hour`), so every existing hour-keyed sky function keeps
 * working - it's just fed the sun's hour instead of the wall clock's.
 *
 * - Night (the dark theme, the moon) begins when the sun is 4° below the
 *   horizon - where golden hour ends and blue hour begins - and ends there in
 *   the morning.
 * - The light window's keyframes ride the sun's height as a fraction of
 *   today's noon height: dawn and dusk at the night boundary, midday at solar
 *   noon, morning/afternoon in between. A low winter sun therefore spends
 *   longer in the warm keyframes - which is what a low winter sun looks like.
 * - The early-night afterglow and the stars both follow the twilight's depth,
 *   -4° → -18° (astronomical night): the afterglow drains as the stars come
 *   out, and the full field only shows in true night - which a Berlin
 *   midsummer never reaches.
 *
 * Polar cases stay calm by construction: a sun that never sets below -4°
 * simply never makes night (the light sky crossfades from its dusk side to its
 * dawn side around solar midnight instead of jumping), and a sun that never
 * rises above it keeps night all day.
 *
 * No location (UTC, an unknown zone): the old fixed clock, unchanged.
 */

/** Golden hour ends / blue hour begins: the day↔night (theme) boundary. */
export const NIGHT_ELEVATION = -4;
/** Astronomical night: the twilight has fully drained, every star is out. */
export const TRUE_NIGHT_ELEVATION = -18;

export type SkyMoment = {
  /** Dark theme + moon. */
  isNight: boolean;
  /** The light sky's position on skyTimeline's palette clock. */
  hour: number;
  /**
   * Only around solar midnight in a sky that never reaches night: the dawn
   * side to crossfade toward (weight 0 → all `hour`, 1 → all `blend.hour`).
   */
  blend: { hour: number; weight: number } | null;
  /** The sunset's warmth left in the night sky, 1 → 0 (--night-afterglow). */
  afterglow: number;
  /** How far the stars have come out, 0 → 1 (nightStarField.ts). */
  starDepth: number;
  moon: MoonPhase;
  isSouthernHemisphere: boolean;
  /** "sun" when timed to the real sun, "clock" for the fixed-hour fallback. */
  source: "sun" | "clock";
};

const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));

const kfHour = (label: string): number => {
  const kf = AMBIENT_SKY_KEYFRAMES.find((k) => k.label === label);
  if (!kf) throw new Error(`no sky keyframe "${label}"`);
  return kf.hour;
};

/**
 * Where each keyframe sits on the sun's climb, as a fraction of the way from
 * the night boundary (0) to today's noon height (1). Morning and afternoon are
 * placed where an equinox mid-latitude sun stands at their old clock hours, so
 * the day the fixed clock was tuned on still looks the way it did.
 */
const RISING: ReadonlyArray<[number, number]> = [
  [0, kfHour("dawn")],
  [0.5, kfHour("morning")],
  [1, kfHour("midday")],
];
const SETTING: ReadonlyArray<[number, number]> = [
  [1, kfHour("midday")],
  [0.6, kfHour("afternoon")],
  [0, kfHour("dusk")],
];

const alongAnchors = (
  anchors: ReadonlyArray<[number, number]>,
  p: number,
): number => {
  for (let i = 1; i < anchors.length; i++) {
    const [p0, h0] = anchors[i - 1];
    const [p1, h1] = anchors[i];
    const lo = Math.min(p0, p1);
    const hi = Math.max(p0, p1);
    if (p >= lo && p <= hi) {
      return h0 + ((p - p0) / (p1 - p0)) * (h1 - h0);
    }
  }
  return anchors[anchors.length - 1][1];
};

/**
 * The afterglow is the *sunset's* warmth: evening only, never pre-dawn. It
 * eases out over the two hours before solar midnight (so a Berlin June night,
 * which never drains the twilight, doesn't drop it at the turn) and eases in
 * over the two after solar noon (so a polar-night "afternoon" doesn't switch
 * it on at noon). Mid-latitude dusk sits well inside, at full weight.
 */
const AFTERGLOW_EASE_DEG = 30;
const eveningWeight = (hourAngle: number): number =>
  hourAngle <= 0
    ? 0
    : clamp01(hourAngle / AFTERGLOW_EASE_DEG) *
      clamp01((180 - hourAngle) / AFTERGLOW_EASE_DEG);

/** Half-width (hour-angle degrees) of the solar-midnight dusk→dawn crossfade. */
const MIDNIGHT_BLEND_DEG = 15;

/** The fixed-clock sky: the fallback with no location, and the `?skyHour=` pin. */
export const clockSkyMoment = (hour: number, date: Date): SkyMoment => {
  const isNight = hour >= NIGHT_START_HOUR || hour < NIGHT_END_HOUR;
  return {
    isNight,
    hour,
    blend: null,
    afterglow: nightAfterglowAt(hour),
    starDepth: isNight ? 1 : 0,
    moon: moonPhaseAt(date),
    isSouthernHemisphere: false,
    source: "clock",
  };
};

export const skyMomentAt = (date: Date, location: LatLon | null): SkyMoment => {
  if (!location) {
    return clockSkyMoment(date.getHours() + date.getMinutes() / 60, date);
  }
  const { lat, lon } = location;
  const { elevation, hourAngle, declination } = solarPositionAt(date, lat, lon);
  const noon = noonElevation(lat, declination);
  const isNight = elevation < NIGHT_ELEVATION;
  const starDepth = clamp01(
    (NIGHT_ELEVATION - elevation) / (NIGHT_ELEVATION - TRUE_NIGHT_ELEVATION),
  );

  // Height through today's light window; 0 for a sun that never clears it.
  const p =
    noon > NIGHT_ELEVATION
      ? clamp01((elevation - NIGHT_ELEVATION) / (noon - NIGHT_ELEVATION))
      : 0;
  const settingHour = alongAnchors(SETTING, p);
  const risingHour = alongAnchors(RISING, p);

  // Hour angle as 0..360 from solar noon: setting side first, then rising.
  const u = hourAngle >= 0 ? hourAngle : hourAngle + 360;
  let hour = hourAngle >= 0 ? settingHour : risingHour;
  let blend: SkyMoment["blend"] = null;
  // Only a sky that stays light through solar midnight needs this; anywhere
  // else this stretch is night and the light sky isn't shown.
  if (
    midnightElevation(lat, declination) >= NIGHT_ELEVATION &&
    Math.abs(u - 180) < MIDNIGHT_BLEND_DEG
  ) {
    hour = settingHour;
    blend = {
      hour: risingHour,
      weight: (u - (180 - MIDNIGHT_BLEND_DEG)) / (2 * MIDNIGHT_BLEND_DEG),
    };
  }

  return {
    isNight,
    hour,
    blend,
    afterglow: isNight ? (1 - starDepth) * eveningWeight(hourAngle) : 0,
    starDepth,
    moon: moonPhaseAt(date),
    isSouthernHemisphere: lat < 0,
    source: "sun",
  };
};

/**
 * The night windows (start/end epoch ms) over the next `hours`, sampled every
 * 10 minutes - for the static loading pages, which pick their first-frame sky
 * before any of this code can load (see skyNightCache.ts).
 */
export const nightWindowsFrom = (
  from: Date,
  location: LatLon,
  hours = 48,
): Array<[number, number]> => {
  const step = 10 * 60_000;
  const end = from.getTime() + hours * 3_600_000;
  const windows: Array<[number, number]> = [];
  let openAt: number | null = null;
  const isNightAt = (t: number) => skyMomentAt(new Date(t), location).isNight;
  // The first instant in (lo, hi] whose night-ness differs from lo's, to the
  // minute - so the loading pages flip within a minute of the app, not ten.
  const edge = (lo: number, hi: number): number => {
    const before = isNightAt(lo);
    while (hi - lo > 60_000) {
      const mid = Math.floor((lo + hi) / 2);
      if (isNightAt(mid) === before) lo = mid;
      else hi = mid;
    }
    return hi;
  };
  for (let t = from.getTime(); t <= end; t += step) {
    const night = isNightAt(t);
    const prev = t - step;
    if (night && openAt === null) {
      openAt = t === from.getTime() ? t : edge(prev, t);
    }
    if (!night && openAt !== null) {
      windows.push([openAt, edge(prev, t)]);
      openAt = null;
    }
  }
  if (openAt !== null) windows.push([openAt, end]);
  return windows;
};
