import { QuestionCategoryId } from '@src/shared/data/questions';

export interface UserCfg {
  isOnboardingComplete: boolean;
  blockedHosts: string[];
}

export interface Answer {
  questionCategoryId: QuestionCategoryId;
  val: string;
  ts: number;
}

export interface SyncData {
  cfg: UserCfg;
  lastBlocked: number;
  answers: Answer[];
}

export interface StaticCfg {
  ShowAgainThreshold: number;
}
