import { Answer, SyncData } from "@src/dataInterface/syncData";
import { DEFAULT_SYNC_DATA } from "@src/dataInterface/syncData.const";
import { mergeSyncDataWithDefaults } from "@src/dataInterface/mergeSyncDataWithDefaults";
import { Preferences } from "@capacitor/preferences";
import { handleDataError, DataStorageError } from "@src/dataInterface/errors";
import { safeJsonParse } from "@src/util/safeJsonParse";

const DB_KEY = "mindedSyncData";

export const saveSyncDataN = async (syncData: SyncData): Promise<void> => {
  try {
    await Preferences.set({
      key: DB_KEY,
      value: JSON.stringify(syncData),
    });
  } catch (error) {
    handleDataError(
      new DataStorageError("Failed to save sync data", "ios", "write", error),
      "iOS: saveSyncDataN",
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
  try {
    const result = await Preferences.get({ key: DB_KEY });
    if (!result.value) {
      return DEFAULT_SYNC_DATA;
    }

    const parsed = safeJsonParse<Partial<SyncData>>(result.value);
    if (parsed === undefined) {
      handleDataError(
        new Error("Invalid JSON in stored data"),
        "iOS: getSyncDataN - failed to parse stored data",
      );
      return DEFAULT_SYNC_DATA;
    }

    return mergeSyncDataWithDefaults(parsed);
  } catch (error) {
    handleDataError(
      new DataStorageError("Failed to read sync data", "ios", "read", error),
      "iOS: getSyncDataN",
    );
    return DEFAULT_SYNC_DATA;
  }
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

// iOS isn't actively developed and has no usage-observation source.
export const getUsageObservationRawN = (): string | null => null;
