import { Answer, SyncData } from "@src/dataInterface/syncData";
import { DEFAULT_SYNC_DATA } from "@src/dataInterface/syncData.const";
// import { iosInterface } from "@src/dataInterface/ios/iosInterface";

export const saveSyncDataN = async (syncData: SyncData): Promise<void> => {
  return Promise.resolve(undefined);
  // iosInterface.saveDataString(JSON.stringify(syncData));
};

export const getSyncDataN = async (): Promise<SyncData> => {
  return DEFAULT_SYNC_DATA;

  // const str = iosInterface.retrieveDataString();
  // try {
  //   return {
  //     ...DEFAULT_SYNC_DATA,
  //     ...JSON.parse(str),
  //   };
  // } catch (e) {
  //   console.error(e);
  //   return DEFAULT_SYNC_DATA;
  // }
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
