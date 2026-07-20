import { DEFAULT_SYNC_DATA } from "@src/dataInterface/syncData.const";
import type { SyncData, UserCfg } from "@src/dataInterface/syncData";

export const resolveSettingsCfg = async (
  readSyncData: () => Promise<SyncData>,
): Promise<UserCfg> => {
  try {
    return (await readSyncData()).cfg;
  } catch {
    return DEFAULT_SYNC_DATA.cfg;
  }
};
