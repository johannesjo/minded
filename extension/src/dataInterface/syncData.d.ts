import { QuestionCategoryId } from "@src/shared/data/questions";
import { QID } from "@src/shared/data/questionId";
import { MoodCheckinVal } from "@src/shared/components/interaction/moodCheckin/moodCheckin.const";
import { SelfAssessmentId } from "@src/shared/components/interaction/selfAssessmentInteraction/selfAssessment.model";

/** Time range for a single day (24h format, e.g., "09:00" to "17:00") */
export interface TimeRange {
  start: string; // HH:MM format
  end: string; // HH:MM format
}

/** Schedule for each day of the week (0 = Sunday, 6 = Saturday) */
export interface FocusSchedule {
  enabled: boolean;
  /** Per-day schedule. If a day is missing, blocking is disabled for that day */
  days: {
    [dayIndex: number]: TimeRange | null; // null means no blocking that day
  };
}

/**
 * Sleep wind-down schedule. The TimeRange `start` is bedtime; `end` is wake time.
 * If `end` <= `start`, the window crosses midnight (e.g. 22:00 -> 07:00).
 * The day index refers to the day the bedtime begins on.
 */
export interface SleepWindDownCfg {
  enabled: boolean;
  days: {
    [dayIndex: number]: TimeRange | null;
  };
}

export interface UserCfg {
  isOnboardingComplete: boolean;
  blockedHosts: string[];
  blockedApps: string[];
  focusSchedule?: FocusSchedule;
  soundEnabled?: boolean; // Enable/disable completion sound (default: true)
  sleepWindDown?: SleepWindDownCfg;
}

export interface Answer {
  id: string;
  qid: QID | null;
  questionCategoryId: QuestionCategoryId;
  val: string | number;
  ts: number;
}

export type SelfAssessmentData = {
  [key in SelfAssessmentId]: SelfAssessmentEntry;
};

export interface SelfAssessmentEntry {
  ts: number;
  val: number;
}

/** Emotion labeling session data */
export interface EmotionLabelingData {
  ts: number;
  emotions: string[];
  bodyLocations: string[];
}

export interface SyncData {
  cfg: UserCfg;
  answers: Answer[];
  lastBlockedTS: number;
  lastBlockedUrl: string;
  moodCheckTS: number;
  moodCheckVal?: MoodCheckinVal;
  moodCheckAdditional: string;
  energyLvlTS: number;
  energyLvlVal: number;
  dailyQuestionsMorningTS: number;
  dailyQuestionsEveningTS: number;

  sunTaps: {
    [key: string]: number;
  };
  attempts: {
    [key: string]: number;
  };
  lastBrowsingBehaviorRatingTS: number;
  browsingBehaviorRating: {
    [key: string]: number;
  };
  lastAppUsageRatingTS: number;
  appUsageRating: {
    [key: string]: number;
  };
  selfAssessment: SelfAssessmentData;
  alternativeApps: string[];
  alternativeWebsites: string[];

  activeTimer: {
    endTS: number;
    durationS: number;
  } | null;

  emotionLabeling: EmotionLabelingData | null;

  // Daily budget feature
  dailyBudget: DailyBudget | null;
  dailyUsage: {
    [dateISO: string]: DailyUsage;
  };
  budgetPromptDismissedTS: number;

  /**
   * Sleep wind-down — per-night state.
   * `nightId` is the ISO date of the day on which bedtime begins (so e.g.
   * unlocking at 02:00 still resolves to the previous evening's nightId).
   */
  sleepWindDownDismissedNightId: string;
  sleepWindDownSnoozeUntilTS: number;
}

export interface StaticCfg {
  ShowAgainThreshold: number;
}

/** Daily usage budget configuration */
export interface DailyBudget {
  globalMinutes: number; // Total allowed minutes across all sites (e.g., 30)
  perSiteMinutes?: {
    // Optional per-site overrides
    [host: string]: number;
  };
}

/** Daily usage tracking */
export interface DailyUsage {
  totalSeconds: number; // Total time today across all blocked sites
  perSite: {
    // Per-site breakdown
    [host: string]: number; // Seconds spent on this site today
  };
}
