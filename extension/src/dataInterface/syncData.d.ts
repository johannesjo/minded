import { QuestionCategoryId } from "@src/shared/data/questions";
import { QID } from "@src/shared/data/questionId";
import { MoodCheckinVal } from "@src/shared/components/interaction/moodCheckin/moodCheckin.const";
import { SelfAssessmentId } from "@src/shared/components/interaction/selfAssessmentInteraction/selfAssessment.model";

export interface UserCfg {
  isOnboardingComplete: boolean;
  blockedHosts: string[];
  blockedApps: string[];
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
}

export interface StaticCfg {
  ShowAgainThreshold: number;
}
