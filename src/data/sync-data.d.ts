import { QuestionCategoryId } from '@src/data/questions';

export interface UserCfg {
  blockedHosts: string[];
}

export interface Answer {
  questionId: QuestionCategoryId;
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
