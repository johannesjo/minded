import { QuestionCategoryId } from "@src/shared/data/questions";
import { Answer } from "@src/dataInterface/syncData";
import { MoodCheckinVal } from "@src/shared/components/interaction/moodCheckin/moodCheckin.const";
import { SelfAssessmentEntryForDashboard } from "@src/shared/components/dashboard/dashboardCards/SelfAssessmentCard";

export enum DashboardGroupType {
  TxtQuestion = "TxtQuestion",
  Quote = "Quote",
  MoodCheckin = "MoodCheckin",
  EnergyLvl = "EnergyLvl",
  Stats = "Stats",
  BrowsingBehaviorRating = "BrowsingBehaviorRating",
  AppUsageRating = "AppUsageRating",
  SelfAssessment = "SelfAssessment",
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

export interface DashboardGroupStats {
  type: DashboardGroupType.Stats;
  attempts: number;
  sunTaps: number;
}

export interface DashboardGroupMood {
  id: QuestionCategoryId.XMoodCheckin;
  type: DashboardGroupType.MoodCheckin;
  mood: MoodCheckinVal;
  additionalTxt?: string;
}

export interface DashboardGroupEnergyLvl {
  id: QuestionCategoryId.XEnergyLevelToday;
  type: DashboardGroupType.EnergyLvl;
  energyLvl: number;
}

export interface DashboardGroupBrowsingBehaviorHappiness {
  id: QuestionCategoryId.XBrowsingBehaviorHappiness;
  type: DashboardGroupType.BrowsingBehaviorRating;
  data: { [key: string]: number };
}

export interface DashboardGroupAppUsageHappiness {
  id: QuestionCategoryId.XAppUsageHappiness;
  type: DashboardGroupType.AppUsageRating;
  data: { [key: string]: number };
}

export interface DashboardGroupSelAssessment {
  id: QuestionCategoryId.XSelfAssessment;
  type: DashboardGroupType.SelfAssessment;
  entries: SelfAssessmentEntryForDashboard[];
}

export type DashboardGroup =
  | DashboardGroupTxtQuestion
  | DashboardGroupBrowsingBehaviorHappiness
  | DashboardGroupAppUsageHappiness
  | DashboardGroupStats
  | DashboardGroupQuote
  | DashboardGroupEnergyLvl
  | DashboardGroupSelAssessment
  | DashboardGroupMood;
