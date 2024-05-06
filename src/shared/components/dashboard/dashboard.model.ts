import { QuestionCategoryId } from "@src/shared/data/questions";
import { Answer } from "@src/shared/data/syncData";
import { MoodCheckinVal } from "@src/shared/components/interaction/mood-checkin/moodCheckin.const";

export enum DashboardGroupType {
  Standard = "Standard",
  Quote = "Quote",
  MoodCheckin = "MoodCheckin",
  Stats = "Stats",
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
}

export interface DashboardGroupMood {
  type: DashboardGroupType.MoodCheckin;
  mood: MoodCheckinVal;
  additionalTxt?: string;
}

export type DashboardGroup =
  | DashboardGroupStandard
  | DashboardGroupStats
  | DashboardGroupQuote
  | DashboardGroupMood;
