import { QuestionCategoryId } from "@src/shared/data/questions";
import { Answer } from "@src/dataInterface/syncData";
import { SelfAssessmentEntryForDashboard } from "@src/shared/components/dashboard/dashboardCards/SelfAssessmentCard";

export enum DashboardGroupType {
  TxtQuestion = "TxtQuestion",
  Quote = "Quote",
  EnergyLvl = "EnergyLvl",
  SelfAssessment = "SelfAssessment",
  EmotionLabeling = "EmotionLabeling",
  SleepWindDown = "SleepWindDown",
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

export interface DashboardGroupSelAssessment {
  id: QuestionCategoryId.XSelfAssessment;
  type: DashboardGroupType.SelfAssessment;
  entries: SelfAssessmentEntryForDashboard[];
}

export interface DashboardGroupEmotionLabeling {
  id: QuestionCategoryId.XEmotionLabeling;
  type: DashboardGroupType.EmotionLabeling;
  emotions: string[];
}

export interface DashboardGroupSleepWindDown {
  type: DashboardGroupType.SleepWindDown;
}

export type DashboardGroup =
  | DashboardGroupTxtQuestion
  | DashboardGroupQuote
  | DashboardGroupEnergyLvl
  | DashboardGroupSelAssessment
  | DashboardGroupEmotionLabeling
  | DashboardGroupSleepWindDown;
