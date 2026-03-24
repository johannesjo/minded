import { SyncData } from "@src/dataInterface/syncData";
import { DEFAULT_SYNC_DATA } from "@src/dataInterface/syncData.const";

/** Merge parsed (potentially partial) sync data with defaults.
 *  Deep-merges cfg and selfAssessment; other fields are replaced wholesale. */
export const mergeSyncDataWithDefaults = (
  parsed: Partial<SyncData>,
): SyncData => ({
  ...DEFAULT_SYNC_DATA,
  ...parsed,
  cfg: { ...DEFAULT_SYNC_DATA.cfg, ...parsed.cfg },
  selfAssessment: {
    ...DEFAULT_SYNC_DATA.selfAssessment,
    ...parsed.selfAssessment,
  },
});
