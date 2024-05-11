import { QuestionCategoryId } from "@src/shared/data/questions";
import { QID } from "@src/shared/data/questionId";
import { MoodCheckinVal } from "@src/shared/components/interaction/mood-checkin/moodCheckin.const";

export interface UserCfg {
  isOnboardingComplete: boolean;
  blockedHosts: string[];
}

export interface Answer {
  id: string;
  qid: QID | null;
  questionCategoryId: QuestionCategoryId;
  val: string | number;
  ts: number;
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

  blocked: {
    [key: string]: number;
  };
  attempts: {
    [key: string]: number;
  };
  lastBrowsingBehaviorRatingTS: number;
  browsingBehaviorRating: {
    [key: string]: number;
  };
}

export interface StaticCfg {
  ShowAgainThreshold: number;
}
