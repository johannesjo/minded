import { SyncData } from "@src/dataInterface/syncData";
import { DashboardGroup } from "@src/shared/components/dashboard/dashboard.model";
import { getDashboardEntriesFromQuestions } from "@src/shared/components/dashboard/getDashboardEntriesFromQuestions";

export const updateDashboardEntriesFromQuestions = (
  syncData: SyncData,
  dashboardGroups: DashboardGroup[],
  now = new Date(),
): DashboardGroup[] => {
  const newDashboardGroups = getDashboardEntriesFromQuestions(syncData, now);

  if (dashboardGroups.length !== newDashboardGroups.length) {
    return newDashboardGroups;
  }

  const dashboardGroupsCopy = [...dashboardGroups];
  // Update existing groups with new data
  newDashboardGroups.forEach((newGroup) => {
    const existingGroupIndex = dashboardGroupsCopy.findIndex(
      (group) => group.type === newGroup.type,
    );

    if (existingGroupIndex !== -1) {
      // Update the existing group with the new data
      dashboardGroupsCopy[existingGroupIndex] = {
        ...dashboardGroupsCopy[existingGroupIndex],
        ...newGroup,
      };
    } else {
      // if there is any inconsistency in the groups, return the new groups
      return newDashboardGroups;
    }
  });

  return dashboardGroupsCopy;
};
