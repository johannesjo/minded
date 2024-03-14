import { Answer, SyncData, UserCfg } from "@src/shared/data/sync-data";
import { bro } from "@src/util/browser";
import { DEFAULT_SYNC_DATA } from "@src/shared/data/sync-data.const";
import { getIsoDate } from "@src/util/getIsoDate";

export const saveAnswer = (answer: Answer): Promise<void> => {
  return getSyncData()
    .then((syncData) =>
      saveSyncData({
        ...syncData,
        answers: [...syncData.answers, answer],
      }),
    )
    .then(() => {
      getSyncData().then(console.log);
    });
};

export const updateAnswer = (answerToUpdate: Answer): Promise<void> => {
  return getSyncData()
    .then((syncData) =>
      saveSyncData({
        ...syncData,
        answers: syncData.answers.map((aI) =>
          aI.id === answerToUpdate.id ? { ...aI, ...answerToUpdate } : aI,
        ),
      }),
    )
    .then(() => {
      getSyncData().then(console.log);
    });
};

export const removeAnswer = (answerId: string): Promise<void> => {
  return getSyncData()
    .then((syncData) =>
      saveSyncData({
        ...syncData,
        answers: syncData.answers.filter((aI) => aI.id !== answerId),
      }),
    )
    .then(() => {
      getSyncData().then(console.log);
    });
};

export const saveSyncData = (syncData: SyncData): Promise<void> => {
  if (bro.runtime?.id) {
    return bro.storage.sync.set(syncData);
  } else {
    throw new Error(
      "Extension was reloaded, please reload tab for it to work here again",
    );
  }
};

export const updateSyncData = async (
  newSyncData: Partial<SyncData>,
): Promise<void> => {
  if (bro.runtime?.id) {
    const syncData = await getSyncData();
    return bro.storage.sync.set({
      ...syncData,
      ...newSyncData,
    });
  } else {
    throw new Error(
      "Extension was reloaded, please reload tab for it to work here again",
    );
  }
};

export const updateCfg = async (cfg: Partial<UserCfg>): Promise<void> => {
  if (bro.runtime?.id) {
    const syncData = await getSyncData();
    return bro.storage.sync.set({
      ...syncData,
      cfg: {
        ...syncData.cfg,
        ...cfg,
      },
    });
  } else {
    throw new Error(
      "Extension was reloaded, please reload tab for it to work here again",
    );
  }
};

//
export const getSyncData = (): Promise<SyncData> => {
  if (bro.runtime?.id) {
    return bro.storage.sync.get().then((syncData) => ({
      ...DEFAULT_SYNC_DATA,
      ...syncData,
    }));
  } else {
    throw new Error(
      "Extension was reloaded, please reload tab for it to work here again",
    );
  }
};

export const countOpeningAttempt = async (): Promise<void> => {
  const ds = getIsoDate();
  if (bro.runtime?.id) {
    const syncData = await getSyncData();
    return bro.storage.sync.set({
      ...syncData,
      attempts: {
        ...syncData.attempts,
        [ds]: syncData.attempts[ds] ? syncData.attempts[ds] + 1 : 1,
      },
    });
  } else {
    throw new Error(
      "Extension was reloaded, please reload tab for it to work here again",
    );
  }
};

export const countBlockedAttempt = async (): Promise<void> => {
  const ds = getIsoDate();
  if (bro.runtime?.id) {
    const syncData = await getSyncData();
    return bro.storage.sync.set({
      ...syncData,
      blocked: {
        ...syncData.blocked,
        [ds]: syncData.blocked[ds] ? syncData.blocked[ds] + 1 : 1,
      },
    });
  } else {
    throw new Error(
      "Extension was reloaded, please reload tab for it to work here again",
    );
  }
};
