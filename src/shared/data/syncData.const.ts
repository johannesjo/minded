import { StaticCfg, SyncData } from "./syncData";

export const DEFAULT_SYNC_DATA: SyncData = {
  cfg: {
    isOnboardingComplete: false,
    blockedHosts: [
      "reddit.com",
      "facebook.com",
      "youtube.com",
      "instagram.com",
      "tiktok.com",
      "netflix.com",
      "amazon.com",
      // TODO remove other urls
      "tagesschau.de",
      "spiegel.de",
      "golem.de",
      "zeit.de",
      "wikipedia.org",
      "localhost",
      "localhost:3000",
    ],
  },
  lastBlocked: 0,
  lastBlockedUrl: "",
  answers: [],
  attempts: {},
  blocked: {},
};

export const STATIC_CFG: StaticCfg = {
  ShowAgainThreshold: 60 * 1000,
};
