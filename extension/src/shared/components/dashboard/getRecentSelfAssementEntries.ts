import { SelfAssessmentData } from "@src/dataInterface/syncData";
import { SelfAssessmentEntryForDashboard } from "@src/shared/components/dashboard/dashboardCards/SelfAssessmentCard";
import { SelfAssessmentId } from "@src/shared/components/interaction/selfAssessmentRating/selfAssessment.model";
import { DEFAULT_TS_VAL } from "@src/dataInterface/syncData.const";
import { hasHappenedInLastXDay } from "@src/util/isToday";

export const getRecentSelfAssessmentEntries = (
  selfAssessmentData: SelfAssessmentData,
  max?: number,
): SelfAssessmentEntryForDashboard[] => {
  const categoryEntries: SelfAssessmentEntryForDashboard[] = Object.entries(
    selfAssessmentData,
  ).map(([key, entry], i) => ({
    ...entry,
    selfAssessmentId: key as SelfAssessmentId,
  }));

  // Sort the entries in descending order based on the timestamp
  const sortedEntries = categoryEntries
    .filter(
      (entry) =>
        entry.ts > DEFAULT_TS_VAL && hasHappenedInLastXDay(entry.ts, 10),
    )
    .sort((a, b) => b.ts - a.ts);

  // Return the most recent three entries
  return max ? sortedEntries.slice(0, max) : sortedEntries;
};
