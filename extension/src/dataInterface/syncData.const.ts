import { StaticCfg, SyncData } from "./syncData";
import { IS_ANDROID } from "@src/dataInterface/extension/isAndroid";

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
  lastBlockedTS: 99,
  lastBlockedUrl: "",
  moodCheckTS: 99,
  moodCheckVal: undefined,
  moodCheckAdditional: "",
  browsingBehaviorRating: {},
  lastBrowsingBehaviorRatingTS: 99,
  energyLvlVal: 0,
  energyLvlTS: 99,
  answers: [],
  attempts: {},
  sunTaps: {},
};

export const STATIC_CFG: StaticCfg = {
  ShowAgainThreshold: 5 * 60 * 1000,
};
