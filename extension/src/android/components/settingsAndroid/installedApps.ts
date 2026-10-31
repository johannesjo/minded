import { androidInterface } from "@src/dataInterface/android/androidInterface";
import { safeJsonParse } from "@src/util/safeJsonParse";

export type InstalledApp = { packageName: string; name: string };

/** User-facing installed apps, A-Z by label (native). Synchronous and slow-ish
 * (labels are loaded per app), so callers defer it off the first paint. */
export const readInstalledApps = (): InstalledApp[] =>
  safeJsonParse<InstalledApp[]>(androidInterface.getAllApps(), []);
