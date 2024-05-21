import { QuestionCategoryId } from "@src/shared/data/questions";
import { Answer } from "@src/dataInterface/syncData";
import { MoodCheckinVal } from "@src/shared/components/interaction/mood-checkin/moodCheckin.const";

export enum DashboardGroupType {
  Standard = "Standard",
  Quote = "Quote",
  MoodCheckin = "MoodCheckin",
  EnergyLvl = "EnergyLvl",
  Stats = "Stats",
  BrowsingBehaviorRating = "BrowsingBehaviorRating",
}

export interface DashboardGroupStandard {
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
  type: DashboardGroupType.MoodCheckin;
  mood: MoodCheckinVal;
  additionalTxt?: string;
}

export interface DashboardGroupEnergyLvl {
  type: DashboardGroupType.EnergyLvl;
  energyLvl: number;
}

export interface DashboardGroupBrowsingBehavior {
  type: DashboardGroupType.BrowsingBehaviorRating;
  data: { [key: string]: number };
}

export type DashboardGroup =
  | DashboardGroupStandard
  | DashboardGroupBrowsingBehavior
  | DashboardGroupStats
  | DashboardGroupQuote
  | DashboardGroupEnergyLvl
  | DashboardGroupMood;
