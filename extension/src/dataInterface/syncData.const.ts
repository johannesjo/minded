import {
  FocusSchedule,
  SelfAssessmentEntry,
  SleepWindDownCfg,
  StaticCfg,
  SyncData,
} from "./syncData";
// @ts-ignore - path alias resolved at build time based on platform
import { IS_ANDROID } from "@dataInterface/system";

import { SelfAssessmentId } from "@src/shared/components/interaction/selfAssessmentInteraction/selfAssessment.model";

export const DEFAULT_TS_VAL = 99;

/**
 * Default sleep wind-down: 22:00 -> 07:00 every day, disabled by default
 * so users opt in with a single toggle.
 */
export const DEFAULT_SLEEP_WIND_DOWN: SleepWindDownCfg = {
  enabled: false,
  days: {
    0: { start: "22:00", end: "07:00" },
    1: { start: "22:00", end: "07:00" },
    2: { start: "22:00", end: "07:00" },
    3: { start: "22:00", end: "07:00" },
    4: { start: "22:00", end: "07:00" },
    5: { start: "22:00", end: "07:00" },
    6: { start: "22:00", end: "07:00" },
  },
};

/** Default focus schedule: 9am-5pm on weekdays (Mon-Fri), disabled on weekends */
export const DEFAULT_FOCUS_SCHEDULE: FocusSchedule = {
  enabled: false, // Start disabled so current behavior is preserved
  days: {
    0: null, // Sunday - no blocking
    1: { start: "09:00", end: "17:00" }, // Monday
    2: { start: "09:00", end: "17:00" }, // Tuesday
    3: { start: "09:00", end: "17:00" }, // Wednesday
    4: { start: "09:00", end: "17:00" }, // Thursday
    5: { start: "09:00", end: "17:00" }, // Friday
    6: null, // Saturday - no blocking
  },
};

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
  dailyQuestionsMorningTS: DEFAULT_TS_VAL,
  dailyQuestionsEveningTS: DEFAULT_TS_VAL,
  answers: [],
  attempts: {},
  sunTaps: {},
  sunTapTimestamps: [],
  selfAssessment: Object.values(SelfAssessmentId).reduce(
    (acc, curr) => {
      acc[curr] = { ts: DEFAULT_TS_VAL, val: -1 };
      return acc;
    },
    {} as Record<SelfAssessmentId, SelfAssessmentEntry>,
  ),
  alternativeApps: [],
  alternativeWebsites: [],
  patternInsightState: {
    shownInsightIdsByDate: {},
  },
  activeTimer: null,
  emotionLabeling: null,
  // Daily budget feature
  dailyBudget: null,
  dailyUsage: {},
  budgetPromptDismissedTS: DEFAULT_TS_VAL,
  sleepWindDownDismissedNightId: "",
  sleepWindDownSnoozeUntilTS: 0,
  sleepWindDownProgressNightId: "",
  sleepWindDownCompleted: [],
  sleepWindDownBrainDumpDraft: "",
  sleepWindDownGratitudeDraft: "",
  sleepWindDownTomorrowDraft: "",
};

export const STATIC_CFG: StaticCfg = {
  ShowAgainThreshold: 5 * 60 * 1000,
};
