import { SelfAssessmentEntry, StaticCfg, SyncData } from "./syncData";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
import { IS_ANDROID } from "@dataInterface/isAndroid";
import { SelfAssessmentId } from "@src/shared/components/interaction/selfAssessmentInteraction/selfAssessment.model";

export const DEFAULT_TS_VAL = 99;

export const DEFAULT_SYNC_DATA: SyncData = {
  cfg: {
    isOnboardingComplete: false,
    blockedApps: [],
    blockedHosts: IS_ANDROID
      ? []
      : [
          "reddit.com",
          "facebook.com",
          "youtube.com",
          "instagram.com",
          "tiktok.com",
          "netflix.com",
          "amazon.com",
          // TODO remove other urls
          // "tagesschau.de",
          // "spiegel.de",
          // "golem.de",
          // "zeit.de",
          // "wikipedia.org",
          // "localhost",
          // "localhost:3000",
        ],
  },
  // NOTE: 99 is set to pass isToday check
  lastBlockedTS: DEFAULT_TS_VAL,
  lastBlockedUrl: "",
  moodCheckTS: DEFAULT_TS_VAL,
  moodCheckVal: undefined,
  moodCheckAdditional: "",
  browsingBehaviorRating: {},
  lastBrowsingBehaviorRatingTS: DEFAULT_TS_VAL,
  appUsageRating: {},
  lastAppUsageRatingTS: DEFAULT_TS_VAL,
  energyLvlVal: 0,
  energyLvlTS: DEFAULT_TS_VAL,
  answers: [],
  attempts: {},
  sunTaps: {},
  selfAssessment: Object.values(SelfAssessmentId).reduce(
    (acc, curr) => {
      acc[curr] = { ts: DEFAULT_TS_VAL, val: -1 };
      return acc;
    },
    {} as Record<SelfAssessmentId, SelfAssessmentEntry>,
  ),
};

export const STATIC_CFG: StaticCfg = {
  ShowAgainThreshold: 5 * 60 * 1000,
};
