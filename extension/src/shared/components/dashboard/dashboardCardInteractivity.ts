import type { Accessor } from "solid-js";

export const createDashboardCardInteractivity =
  (options: {
    hasId: boolean;
    isSingleCard: boolean;
    isSkyGreeting: boolean;
    getGroupCount: Accessor<number>;
  }): Accessor<boolean> =>
  () =>
    options.hasId &&
    (!options.isSkyGreeting ||
      (options.isSingleCard && options.getGroupCount() === 1));
