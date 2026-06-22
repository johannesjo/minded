import { DailyUsage, SyncData } from "@src/dataInterface/syncData";
import { getIsoDate } from "@src/util/getIsoDate";

/**
 * Create an updated dailyUsage object with added time for a host.
 * Returns the new dailyUsage to be saved via updateSyncData.
 *
 * NOTE: `dailyUsage` is the dormant budget-legacy store (#35) — this write path
 * only fires in (removed) budget mode. The live observed-usage store is
 * `SyncData.usageStats` (interaction/appUsageOrBrowsingBehavior/usageStats.ts).
 */
export const addBudgetUsage = (
  syncData: SyncData,
  host: string,
  secondsToAdd: number,
): { dailyUsage: SyncData["dailyUsage"] } => {
  const today = getIsoDate();
  const currentUsage = syncData.dailyUsage[today] || {
    totalSeconds: 0,
    perSite: {},
  };

  const updatedUsage: DailyUsage = {
    totalSeconds: currentUsage.totalSeconds + secondsToAdd,
    perSite: {
      ...currentUsage.perSite,
      [host]: (currentUsage.perSite[host] || 0) + secondsToAdd,
    },
  };

  return {
    dailyUsage: {
      ...syncData.dailyUsage,
      [today]: updatedUsage,
    },
  };
};
