import { QuestionCategoryId } from '@src/shared/data/questions';

export interface UserCfg {
  blockedHosts: string[];
}

export interface Answer {
  questionCategoryId: QuestionCategoryId;
  val: string;
  ts: number;
}

export interface SyncData {
  cfg: UserCfg;
  answers: Answer[];
}

export interface StaticCfg {
  XXX: number;
}
