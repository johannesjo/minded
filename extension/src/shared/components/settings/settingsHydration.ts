import { DEFAULT_SYNC_DATA } from "@src/dataInterface/syncData.const";
import type {
  Alternative,
  CustomQuestion,
  InterventionPause,
  SessionPlatform,
  SyncData,
  UserCfg,
} from "@src/dataInterface/syncData";
import { getActiveInterventionPause } from "@src/shared/components/interaction/skipCheckIn/skipCheckIn";
import { getEditableAlternatives } from "@src/shared/components/interaction/alternatives/getAlternatives";
import { sortCustomQuestions } from "@src/shared/data/customQuestions";

// Only a week that changes how the sun meets the user is worth a settings
// line; a standing "as it does now" answer changes nothing there.
const getShownInterventionPause = (
  syncData: SyncData,
  now: number,
): InterventionPause | null => {
  const pause = getActiveInterventionPause(syncData, now);
  return pause && pause.kind !== "as_now" ? pause : null;
};

/** Everything the settings pages hand down to their sections, from one read. */
export interface SettingsSnapshot {
  cfg: UserCfg;
  alternatives: Alternative[];
  customQuestions: CustomQuestion[];
  /** The week chosen from the skip check-in, only while it still stands. */
  interventionPause: InterventionPause | null;
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
      interventionPause: getShownInterventionPause(syncData, Date.now()),
    };
  } catch {
    return {
      cfg: DEFAULT_SYNC_DATA.cfg,
      alternatives: [],
      customQuestions: [],
      interventionPause: null,
    };
  }
};
