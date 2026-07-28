import { DEFAULT_SYNC_DATA } from "@src/dataInterface/syncData.const";
import type {
  Alternative,
  CustomQuestion,
  SessionPlatform,
  SyncData,
  UserCfg,
} from "@src/dataInterface/syncData";
import { getEditableAlternatives } from "@src/shared/components/interaction/alternatives/getAlternatives";
import { sortCustomQuestions } from "@src/shared/data/customQuestions";

/** Everything the settings pages hand down to their sections, from one read. */
export interface SettingsSnapshot {
  cfg: UserCfg;
  alternatives: Alternative[];
  customQuestions: CustomQuestion[];
}

/**
 * The single storage read behind a settings page. `platform` comes from the
 * page rather than the build flags, so this stays a plain data module - each
 * settings route is already platform-specific.
 */
export const resolveSettingsSnapshot = async (
  readSyncData: () => Promise<SyncData>,
  platform: SessionPlatform,
): Promise<SettingsSnapshot> => {
  try {
    const syncData = await readSyncData();
    return {
      cfg: syncData.cfg,
      alternatives: getEditableAlternatives(syncData, platform),
      customQuestions: sortCustomQuestions(syncData.customQuestions),
    };
  } catch {
    return {
      cfg: DEFAULT_SYNC_DATA.cfg,
      alternatives: [],
      customQuestions: [],
    };
  }
};
