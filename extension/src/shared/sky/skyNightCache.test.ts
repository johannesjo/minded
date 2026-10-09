import { readFileSync } from "fs";
import { resolve } from "path";
import { locationForTimeZone } from "./timeZoneLocation";
import {
  buildSkyNightCache,
  resetSkyNightCacheThrottle,
  SKY_NIGHT_CACHE_KEY,
  writeSkyNightCache,
} from "./skyNightCache";

// Every static loading page picks light/dark before the bundle loads; each
// must read the live app's night windows (same key, same shape) and keep the
// fixed clock as its fallback.
const LOADING_PAGES = [
  "public/loading-sky.js",
  "src/android/main/index.html",
  "src/android/interaction/index.html",
  "src/android/sleepWindDown/index.html",
  "src/pages/styleguide/index.html",
  "src/pages/styleguide/dashboard.html",
];

describe("skyNightCache", () => {
  it.each(LOADING_PAGES)(
    "%s reads the cache and falls back to the clock",
    (f) => {
      const src = readFileSync(resolve(process.cwd(), f), "utf8");
      expect(src).toContain(`localStorage.getItem("${SKY_NIGHT_CACHE_KEY}")`);
      expect(src).toContain("t >= c.from && t < c.to");
      expect(src).toContain("c.nights[i][0]");
      expect(src).toContain("h >= 19 || h < 6");
    },
  );

  it("covers two days of night windows", () => {
    const now = new Date("2026-06-21T12:00:00Z");
    const cache = buildSkyNightCache(
      now,
      locationForTimeZone("Europe/Berlin")!,
    );
    expect(cache.from).toBe(now.getTime());
    expect(cache.to - cache.from).toBe(48 * 3_600_000);
    expect(cache.nights).toHaveLength(2);
  });

  it("writes the cache, or clears it when there is no location", () => {
    const store = new Map<string, string>();
    (globalThis as unknown as { localStorage: Storage }).localStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    } as Storage;
    resetSkyNightCacheThrottle();
    const now = new Date("2026-06-21T12:00:00Z");
    writeSkyNightCache(now, locationForTimeZone("Europe/Berlin"));
    expect(JSON.parse(store.get(SKY_NIGHT_CACHE_KEY)!)).toEqual(
      buildSkyNightCache(now, locationForTimeZone("Europe/Berlin")!),
    );
    resetSkyNightCacheThrottle();
    writeSkyNightCache(new Date(), null);
    expect(store.has(SKY_NIGHT_CACHE_KEY)).toBe(false);
  });
});
