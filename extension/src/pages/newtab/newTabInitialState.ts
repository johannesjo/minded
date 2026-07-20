import type { SyncData } from "@src/dataInterface/syncData";
import { DEFAULT_TS_VAL } from "@src/dataInterface/syncData.const";

/**
 * Read first-run state without letting a stale extension context strand the new
 * tab on its loading sky. Some platform readers throw before returning a
 * Promise, so the call itself must live inside this async try/catch.
 */
export const resolveInitialOnboardingVisibility = async (
  readSyncData: () => Promise<SyncData>,
): Promise<boolean> => {
  try {
    const syncData = await readSyncData();
    const isFirstRun =
      !syncData.answers.length &&
      syncData.energyLvlTS <= DEFAULT_TS_VAL &&
      syncData.lastBrowsingBehaviorRatingTS <= DEFAULT_TS_VAL;

    return isFirstRun && !syncData.cfg.isOnboardingComplete;
  } catch {
    return false;
  }
};
