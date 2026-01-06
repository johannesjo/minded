import { DailyUsage, SyncData } from "@src/dataInterface/syncData";
import { getIsoDate } from "@src/util/getIsoDate";

/**
 * Create an updated dailyUsage object with added time for a host.
 * Returns the new dailyUsage to be saved via updateSyncData.
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

/**
 * Clean up old usage data (keep only last 7 days).
 * Returns updated dailyUsage if cleanup was needed.
 */
export const cleanupOldUsageData = (
  syncData: SyncData,
): { dailyUsage: SyncData["dailyUsage"] } | null => {
  const now = new Date();
  const cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const cutoffISO = getIsoDate(cutoffDate);

  const oldDates = Object.keys(syncData.dailyUsage).filter(
    (date) => date < cutoffISO,
  );

  if (oldDates.length === 0) {
    return null;
  }

  const newDailyUsage = { ...syncData.dailyUsage };
  for (const date of oldDates) {
    delete newDailyUsage[date];
  }

  return { dailyUsage: newDailyUsage };
};

/**
 * Get today's usage stats
 */
export const getTodayUsage = (syncData: SyncData): DailyUsage => {
  const today = getIsoDate();
  return (
    syncData.dailyUsage[today] || {
      totalSeconds: 0,
      perSite: {},
    }
  );
};
