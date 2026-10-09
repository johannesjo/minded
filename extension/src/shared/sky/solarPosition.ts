/**
 * Where the sun is, from nothing but a date and an approximate position.
 *
 * NOAA's low-precision solar position (the "General Solar Position
 * Calculations" fractional-year series): declination and the equation of time
 * to well under a degree / a minute, which is far finer than the sky needs -
 * the position itself comes from the time zone (timeZoneLocation.ts) and is
 * only ever approximate. Refraction is ignored: the boundaries that matter here
 * sit below the horizon, where it no longer applies.
 *
 * Pure: no clock, no DOM, no network.
 */

const RAD = Math.PI / 180;
const DAY_MS = 86_400_000;

export type SolarPosition = {
  /** Degrees above (+) or below (-) the horizon. */
  elevation: number;
  /**
   * Local hour angle in degrees, -180..180: negative before solar noon (the
   * rising side), positive after it (the setting side), ±180 at solar midnight.
   */
  hourAngle: number;
  /** Solar declination in degrees. */
  declination: number;
};

const fractionalYear = (date: Date): number => {
  const startOfYear = Date.UTC(date.getUTCFullYear(), 0, 1);
  const dayOfYear = Math.floor((date.getTime() - startOfYear) / DAY_MS) + 1;
  const hour =
    date.getUTCHours() +
    date.getUTCMinutes() / 60 +
    date.getUTCSeconds() / 3600;
  return ((2 * Math.PI) / 365) * (dayOfYear - 1 + (hour - 12) / 24);
};

/** The sun's position for an observer at `lat`/`lon` (degrees, east +). */
export const solarPositionAt = (
  date: Date,
  lat: number,
  lon: number,
): SolarPosition => {
  const g = fractionalYear(date);
  const eqTimeMin =
    229.18 *
    (0.000075 +
      0.001868 * Math.cos(g) -
      0.032077 * Math.sin(g) -
      0.014615 * Math.cos(2 * g) -
      0.040849 * Math.sin(2 * g));
  const decl =
    0.006918 -
    0.399912 * Math.cos(g) +
    0.070257 * Math.sin(g) -
    0.006758 * Math.cos(2 * g) +
    0.000907 * Math.sin(2 * g) -
    0.002697 * Math.cos(3 * g) +
    0.00148 * Math.sin(3 * g);

  const utcMin =
    date.getUTCHours() * 60 + date.getUTCMinutes() + date.getUTCSeconds() / 60;
  const trueSolarMin = utcMin + eqTimeMin + 4 * lon;
  // Normalise to -180..180 so the sign says which side of noon we're on.
  let hourAngle = trueSolarMin / 4 - 180;
  hourAngle = ((((hourAngle + 180) % 360) + 360) % 360) - 180;

  const phi = lat * RAD;
  const sinEl =
    Math.sin(phi) * Math.sin(decl) +
    Math.cos(phi) * Math.cos(decl) * Math.cos(hourAngle * RAD);
  return {
    elevation: Math.asin(Math.max(-1, Math.min(1, sinEl))) / RAD,
    hourAngle,
    declination: decl / RAD,
  };
};

/** The sun's elevation at today's solar noon (its highest point). */
export const noonElevation = (lat: number, declination: number): number =>
  90 - Math.abs(lat - declination);

/** The sun's elevation at solar midnight (its lowest point). */
export const midnightElevation = (lat: number, declination: number): number =>
  Math.abs(lat + declination) - 90;
