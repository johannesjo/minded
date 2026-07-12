import { QuestionCategoryId } from "@src/shared/data/questions";
import { Answer } from "@src/dataInterface/syncData";

export enum DashboardGroupType {
  TxtQuestion = "TxtQuestion",
  Quote = "Quote",
  EnergyLvl = "EnergyLvl",
  EmotionLabeling = "EmotionLabeling",
}

export interface DashboardGroupTxtQuestion {
  id: QuestionCategoryId;
  dashboardTxt: string;
  answers: Answer[];
  type: DashboardGroupType;
}

export interface DashboardGroupQuote {
  type: DashboardGroupType.Quote;
}

export interface DashboardGroupEnergyLvl {
  id: QuestionCategoryId.XEnergyLevelToday;
  type: DashboardGroupType.EnergyLvl;
  energyLvl: number;
}

export interface DashboardGroupEmotionLabeling {
  id: QuestionCategoryId.XEmotionLabeling;
  type: DashboardGroupType.EmotionLabeling;
  emotions: string[];
}

export type DashboardGroup =
  | DashboardGroupTxtQuestion
  | DashboardGroupQuote
  | DashboardGroupEnergyLvl
  | DashboardGroupEmotionLabeling;
