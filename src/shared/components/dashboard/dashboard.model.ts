import { QuestionCategoryId } from "@src/shared/data/questions";
import { Answer } from "@src/shared/data/sync-data";

export enum DashboardGroupType {
  Standard = "Standard",
  Quote = "Quote",
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

export type DashboardGroup = DashboardGroupStandard | DashboardGroupQuote;
