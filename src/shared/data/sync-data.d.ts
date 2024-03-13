import { QuestionCategoryId } from "@src/shared/data/questions";

export interface UserCfg {
  isOnboardingComplete: boolean;
  blockedHosts: string[];
}

export interface Answer {
  questionCategoryId: QuestionCategoryId;
  val: string | number;
  ts: number;
}

export interface SyncData {
  cfg: UserCfg;
  answers: Answer[];
  lastBlocked: number;
  lastBlockedUrl: string;
}

export interface StaticCfg {
  ShowAgainThreshold: number;
}
