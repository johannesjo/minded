import { Answer, SyncData } from '@src/data/sync-data';
import { bro } from '@src/util/browser';
import { DEFAULT_SYNC_DATA } from '@src/data/sync-data.const';

export const saveAnswer = (answer: Answer): Promise<void> => {
  console.log('saveAnswer', answer);

  return getSyncData().then(syncData => saveSyncData({
    ...syncData,
    answers: [...syncData.answers, answer]
  })).then(()=>{
    getSyncData().then(console.log);
  });
};


export const saveSyncData = (syncData: SyncData): Promise<void> => {
  if(bro.runtime?.id) {
    return bro.storage.sync.set(syncData);
  } else {
    throw new Error("Extension was reloaded, please reload tab for it to work here again");
  }
};

//
export const getSyncData = (): Promise<SyncData> => {
  if(bro.runtime?.id) {
    return bro.storage.sync.get().then((syncData) => ({
      ...DEFAULT_SYNC_DATA,
      ...syncData,
    }));
  } else {
    throw new Error("Extension was reloaded, please reload tab for it to work here again");
  }
};
