import {
  ANDROID_EV_RESUME,
  androidInterface,
} from "@src/dataInterface/android/androidInterface";
import { safeJsonParse } from "@src/util/safeJsonParse";

export type InstalledApp = { packageName: string; name: string };

let cache: InstalledApp[] | undefined;
// Apps can be installed or removed while minded is in the background.
if (typeof window !== "undefined") {
  window.addEventListener(ANDROID_EV_RESUME, () => (cache = undefined));
}

/** The last read, if one is still fresh - lets a page paint its rows at once. */
export const peekInstalledApps = (): InstalledApp[] | undefined => cache;

/**
 * User-facing installed apps, A-Z by label (native). The native read is
 * synchronous and slow-ish (a label per app), so callers defer it off the
 * first paint; the result is kept until the app next resumes, so moving
 * between settings and the picker reads it once.
 */
export const readInstalledApps = (): InstalledApp[] => {
  if (!cache) {
    const apps = safeJsonParse<InstalledApp[]>(
      androidInterface.getAllApps(),
      [],
    );
    // An empty read is likely a failure, not a phone with no apps: retry next time.
    if (apps.length) cache = apps;
    return apps;
  }
  return cache;
};
