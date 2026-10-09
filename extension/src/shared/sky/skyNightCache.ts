import { nightWindowsFrom } from "./solarSky";
import type { LatLon } from "./timeZoneLocation";

/**
 * The static loading pages (src/android/{main,interaction,sleepWindDown}/index.html,
 * src/pages/newtab/index.html, the styleguide pages) pick their first-frame
 * sky - light or dark - in an inline <head> script, before any bundle loads.
 * They can't run the solar maths, so the live app leaves them its answer: the
 * night windows for the next two days, in localStorage under this key. The
 * inline scripts read it and fall back to the fixed 19:00/06:00 clock when it
 * is missing, stale or unreadable - exactly what they did before - so the
 * loading sky and the mounted app agree on dark vs light and the hand-off is
 * not a light→dark pop. skyNightCache.test.ts pins every inline reader to
 * this key and shape.
 */
export const SKY_NIGHT_CACHE_KEY = "minded-sky-night";

export type SkyNightCache = {
  /** The cache is valid from..to (epoch ms). */
  from: number;
  to: number;
  nights: Array<[number, number]>;
};

/** Rewrite at most this often - the windows cover two days. */
const REFRESH_MS = 3 * 3_600_000;
let lastWriteMs = 0;

export const buildSkyNightCache = (
  now: Date,
  location: LatLon,
): SkyNightCache => {
  const hours = 48;
  return {
    from: now.getTime(),
    to: now.getTime() + hours * 3_600_000,
    nights: nightWindowsFrom(now, location, hours),
  };
};

export const writeSkyNightCache = (
  now: Date,
  location: LatLon | null,
): void => {
  if (now.getTime() - lastWriteMs < REFRESH_MS) return;
  lastWriteMs = now.getTime();
  try {
    if (!location) {
      localStorage.removeItem(SKY_NIGHT_CACHE_KEY);
      return;
    }
    localStorage.setItem(
      SKY_NIGHT_CACHE_KEY,
      JSON.stringify(buildSkyNightCache(now, location)),
    );
  } catch {
    // No storage (private mode, a sandboxed frame): the loading pages keep
    // the clock fallback.
  }
};

/** Test hook. */
export const resetSkyNightCacheThrottle = (): void => {
  lastWriteMs = 0;
};
