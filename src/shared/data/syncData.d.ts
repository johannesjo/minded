import { QuestionCategoryId } from "@src/shared/data/questions";
import { QID } from "@src/shared/data/questionId";

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
  lastBlocked: number;
  lastBlockedUrl: string;
  blocked: {
    [key: string]: number;
  };
  attempts: {
    [key: string]: number;
  };
}

export interface StaticCfg {
  ShowAgainThreshold: number;
}
