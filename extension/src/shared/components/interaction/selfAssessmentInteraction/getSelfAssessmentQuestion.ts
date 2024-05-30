import { SyncData } from "@src/dataInterface/syncData";
import {
  SELF_ASSESSMENT_QUESTIONS,
  SelfAssessmentId,
  SelfAssessmentQuestion,
} from "@src/shared/components/interaction/selfAssessmentInteraction/selfAssessment.model";

export const getSelfAssessmentQuestion = (
  syncData: SyncData,
): SelfAssessmentQuestion => {
  const unanswered = getLongestNonAssessedCategoryIds(syncData);
  const randomIndex = Math.floor(Math.random() * unanswered.length);
  const randomUnansweredId = unanswered[randomIndex];
  return SELF_ASSESSMENT_QUESTIONS.find(
    (q) => q.id === randomUnansweredId,
  ) as SelfAssessmentQuestion;
};

export const getLongestNonAssessedCategoryIds = (
  syncData: SyncData,
): SelfAssessmentId[] => {
  const entriesArray = Object.entries(syncData.selfAssessment);
  const sortedEntries = entriesArray.sort((a, b) => a[1].ts - b[1].ts);
  const oldestEntries = sortedEntries.slice(0, 3);
  const ids = oldestEntries.map((entry) => entry[0] as SelfAssessmentId);
  return ids;
};
