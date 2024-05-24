import { Answer, SyncData } from "@src/dataInterface/syncData";
import { DEFAULT_SYNC_DATA } from "@src/dataInterface/syncData.const";
import { androidInterface } from "@src/dataInterface/android/androidInterface";

export const saveSyncDataN = async (syncData: SyncData): Promise<void> => {
  androidInterface.saveDataString(JSON.stringify(syncData));
};

export const getSyncDataN = async (): Promise<SyncData> => {
  const str = androidInterface.retrieveDataString();
  try {
    return {
      ...DEFAULT_SYNC_DATA,
      ...JSON.parse(str),
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
      getSyncDataN().then(console.log);
    });
  });
};
