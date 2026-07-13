import { Answer, SyncData } from "@src/dataInterface/syncData";
import { DEFAULT_SYNC_DATA } from "@src/dataInterface/syncData.const";
import { mergeSyncDataWithDefaults } from "@src/dataInterface/mergeSyncDataWithDefaults";
import { androidInterface } from "@src/dataInterface/android/androidInterface";
import { handleDataError, DataStorageError } from "@src/dataInterface/errors";
import { safeJsonParse } from "@src/util/safeJsonParse";

export const saveSyncDataN = async (syncData: SyncData): Promise<void> => {
  try {
    androidInterface.saveDataString(JSON.stringify(syncData));
  } catch (error) {
    handleDataError(
      new DataStorageError(
        "Failed to save sync data",
        "android",
        "write",
        error,
      ),
      "Android: saveSyncDataN",
      {
        alertUser: true,
        userMessage:
          "minded couldn't save your latest change - it was not stored. Your earlier data is untouched. Please try again.",
      },
    );
    throw error;
  }
};

export const patchSyncDataN = async (
  syncDataPatch: Partial<SyncData>,
): Promise<void> => {
  const syncData = await getSyncDataN();
  return saveSyncDataN({ ...syncData, ...syncDataPatch });
};

export const getSyncDataN = async (): Promise<SyncData> => {
  const str = androidInterface.retrieveDataString();
  if (!str) {
    return DEFAULT_SYNC_DATA;
  }

  const parsed = safeJsonParse<Partial<SyncData>>(str);
  if (parsed === undefined) {
    handleDataError(
      new Error("Invalid JSON in stored data"),
      "Android: getSyncDataN - failed to parse stored data",
    );
    return DEFAULT_SYNC_DATA;
  }

  return mergeSyncDataWithDefaults(parsed);
};

export const saveAnswerN = (answer: Answer): Promise<void> => {
  return getSyncDataN().then((syncData) => {
    const newAnswers = [...syncData.answers, answer];
    return saveSyncDataN({
      ...syncData,
      answers: newAnswers,
    });
  });
};

/** Raw UsageObservation JSON from the native UsageStatsManager bridge. */
export const getUsageObservationRawN = (): string | null => {
  try {
    return androidInterface.getUsageObservation?.() ?? null;
  } catch {
    return null;
  }
};
