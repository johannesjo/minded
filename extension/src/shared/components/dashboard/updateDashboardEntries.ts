import { SyncData } from "@src/dataInterface/syncData";
import { DashboardGroup } from "@src/shared/components/dashboard/dashboard.model";
import { getDashboardEntriesFromQuestions } from "@src/shared/components/dashboard/getDashboardEntriesFromQuestions";

export const updateDashboardEntriesFromQuestions = (
  syncData: SyncData,
  existingDashboardGroups: DashboardGroup[],
  now = new Date(),
  avoidGreetingKey?: string,
): DashboardGroup[] => {
  const newDashboardGroups = getDashboardEntriesFromQuestions(
    syncData,
    now,
    undefined,
    avoidGreetingKey,
  );

  if (existingDashboardGroups.length !== newDashboardGroups.length) {
    return newDashboardGroups;
  }

  const dashboardGroupsCopy = [...existingDashboardGroups];
  // Update existing groups with new data
  for (let i = 0; i < dashboardGroupsCopy.length; i++) {
    const oldGroup = dashboardGroupsCopy[i];
    const newGroupEntry = newDashboardGroups.find((newGroup) =>
      "id" in newGroup && "id" in oldGroup
        ? newGroup.id === oldGroup.id
        : newGroup.type === oldGroup.type,
    );

    if (newGroupEntry) {
      if (JSON.stringify(newGroupEntry) !== JSON.stringify(oldGroup)) {
        // Update the existing group with the new data
        dashboardGroupsCopy[i] = {
          ...oldGroup,
          ...newGroupEntry,
        } as DashboardGroup;
      }
    } else {
      // if there is any inconsistency in the groups, return the new groups
      return newDashboardGroups;
    }
  }

  return dashboardGroupsCopy;
};
