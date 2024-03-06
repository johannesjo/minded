import { QuestionCategoryId } from '@src/shared/data/questions';
import { Answer } from '@src/shared/data/sync-data';

export interface DashboardGroup {
  id: QuestionCategoryId;
  dashboardTxt: string;
  answers: Answer[];
}
