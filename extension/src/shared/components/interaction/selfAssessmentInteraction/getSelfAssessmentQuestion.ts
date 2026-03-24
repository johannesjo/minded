import { SyncData } from "@src/dataInterface/syncData";
import {
  SELF_ASSESSMENT_QUESTIONS,
  SelfAssessmentId,
  SelfAssessmentQuestion,
} from "@src/shared/components/interaction/selfAssessmentInteraction/selfAssessment.model";
import { getRndEntry } from "@src/util/getRndEntry";

export const getSelfAssessmentQuestion = (
  syncData: SyncData,
): SelfAssessmentQuestion => {
  const unanswered = getLongestNonAssessedCategoryIds(syncData);
  if (unanswered.length === 0) {
    return getRndEntry(SELF_ASSESSMENT_QUESTIONS);
  }
  const randomUnansweredId = getRndEntry(unanswered);
  return (
    SELF_ASSESSMENT_QUESTIONS.find((q) => q.id === randomUnansweredId) ??
    getRndEntry(SELF_ASSESSMENT_QUESTIONS)
  );
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
