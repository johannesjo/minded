import { SyncData } from "@src/dataInterface/syncData";
import { DashboardGroup } from "@src/shared/components/dashboard/dashboard.model";
import {
  getDashboardEntriesFromQuestions,
  guardHeroSlot,
} from "@src/shared/components/dashboard/getDashboardEntriesFromQuestions";

export const updateDashboardEntriesFromQuestions = (
  syncData: SyncData,
  existingDashboardGroups: DashboardGroup[],
  now = new Date(),
  avoidGreetingKey?: string,
): DashboardGroup[] => {
  const newDashboardGroups = getDashboardEntriesFromQuestions(
    syncData,
    now,
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

  // The merge keeps the *existing* card order (so cards don't jump around as you
  // look), only refreshing their contents - which means a greeting that was
  // in-window when the dashboard was first built can go stale as the hours pass
  // (e.g. a morning "Finding Focus Today" hero still showing at night after an
  // app-resume refresh). Re-run the hero guard so the greeting honours the
  // current time even on this incremental path. (newDashboardGroups is already
  // guarded; only the merged copy needs it.)
  return guardHeroSlot(dashboardGroupsCopy, now);
};
