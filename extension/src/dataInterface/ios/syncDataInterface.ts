import { Answer, SyncData } from "@src/dataInterface/syncData";
import { DEFAULT_SYNC_DATA } from "@src/dataInterface/syncData.const";
import { Preferences } from "@capacitor/preferences";

const DB_KEY = "mindedSyncData";

export const saveSyncDataN = async (syncData: SyncData): Promise<void> => {
  return await Preferences.set({
    key: DB_KEY,
    value: JSON.stringify(syncData),
  });
};

export const getSyncDataN = async (): Promise<SyncData> => {
  const result = await Preferences.get({ key: DB_KEY });
  try {
    return {
      ...DEFAULT_SYNC_DATA,
      ...JSON.parse(result.value),
    };
  } catch (e) {
    console.error(e);
    return DEFAULT_SYNC_DATA;
  }
};

export const saveAnswerN = (answer: Answer): Promise<void> => {
  return getSyncDataN().then((syncData) => {
    const newAnswers = [...syncData.answers, answer];
    return saveSyncDataN({
      ...syncData,
      answers: newAnswers,
    }).then(() => {
      // getSyncDataN().then(console.log);
    });
  });
};
