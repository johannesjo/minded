import { QuestionCategoryId } from "@src/shared/data/questions";
import { Answer } from "@src/shared/data/sync-data";

export enum DashboardGroupType {
  Standard = 'Standard',
  Quote = 'Quote',
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
