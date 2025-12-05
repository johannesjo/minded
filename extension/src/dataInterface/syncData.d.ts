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

export interface UserCfg {
  isOnboardingComplete: boolean;
  blockedHosts: string[];
  blockedApps: string[];
  focusSchedule?: FocusSchedule;
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
}

export interface StaticCfg {
  ShowAgainThreshold: number;
}
