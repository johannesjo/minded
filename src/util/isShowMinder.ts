import { SyncData } from '@src/shared/data/sync-data';
import { STATIC_CFG } from '@src/shared/data/sync-data.const';


export const isShowMinder = (syncData: SyncData): boolean => {
  return STATIC_CFG.ShowAgainThreshold < Date.now() - syncData.lastBlocked;
};
