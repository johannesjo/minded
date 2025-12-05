/**
 * Generic helpers to reduce boilerplate in commonSyncDataInterface.ts
 * These helpers encapsulate the common get-modify-save pattern.
 */

import type { SyncData } from "@src/dataInterface/syncData";
import { getIsoDate } from "@src/util/getIsoDate";

// Re-export getSyncData and saveSyncData for use in this module
// These will be imported where needed to avoid circular dependencies
type SyncDataGetter = () => Promise<SyncData>;
type SyncDataSaver = (syncData: SyncData) => Promise<void>;

/**
 * Generic helper to update SyncData fields.
 * Reduces boilerplate for the get-modify-save pattern.
 *
 * @param getSyncData - Function to get current sync data
 * @param saveSyncData - Function to save sync data
 * @param updater - Function that receives current SyncData and returns partial updates
 * @returns Promise<void>
 *
 * @example
 * await updateSyncDataField(getSyncData, saveSyncData, () => ({
 *   moodCheckTS: Date.now(),
 *   moodCheckVal: mood,
 * }));
 */
export const updateSyncDataField = async (
  getSyncData: SyncDataGetter,
  saveSyncData: SyncDataSaver,
  updater: (current: SyncData) => Partial<SyncData>,
): Promise<void> => {
  const syncData = await getSyncData();
  const updates = updater(syncData);
  return saveSyncData({ ...syncData, ...updates });
};

/**
 * Type for date-keyed record fields in SyncData
 */
type DateKeyedFields =
  | "attempts"
  | "sunTaps"
  | "browsingBehaviorRating"
  | "appUsageRating";

/**
 * Update a nested record field with a date-keyed entry.
 * Common pattern for daily counters and ratings.
 *
 * @param getSyncData - Function to get current sync data
 * @param saveSyncData - Function to save sync data
 * @param field - The SyncData field name (e.g., 'attempts', 'sunTaps')
 * @param value - Value to set for the date key
 * @param date - Optional date (defaults to now)
 */
export const updateDateKeyedField = async (
  getSyncData: SyncDataGetter,
  saveSyncData: SyncDataSaver,
  field: DateKeyedFields,
  value: number,
  date: Date = new Date(),
): Promise<void> => {
  const ds = getIsoDate(date);

  return updateSyncDataField(getSyncData, saveSyncData, (syncData) => ({
    [field]: {
      ...(syncData[field] as Record<string, number>),
      [ds]: value,
    },
  }));
};

/**
 * Increment a date-keyed counter by 1.
 *
 * @param getSyncData - Function to get current sync data
 * @param saveSyncData - Function to save sync data
 * @param field - The counter field name ('attempts' | 'sunTaps')
 * @param date - Optional date (defaults to now)
 */
export const incrementDateKeyedCounter = async (
  getSyncData: SyncDataGetter,
  saveSyncData: SyncDataSaver,
  field: "attempts" | "sunTaps",
  date: Date = new Date(),
): Promise<void> => {
  const ds = getIsoDate(date);

  return updateSyncDataField(getSyncData, saveSyncData, (syncData) => {
    const currentRecord = syncData[field] as Record<string, number>;
    const currentValue = currentRecord[ds] || 0;
    return {
      [field]: {
        ...currentRecord,
        [ds]: currentValue + 1,
      },
    };
  });
};
