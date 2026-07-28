import type { Accessor } from "solid-js";

export const createDashboardCardInteractivity =
  (options: {
    isSingleCard: boolean;
    isSkyGreeting: boolean;
    getGroupCount: Accessor<number>;
  }): Accessor<boolean> =>
  () =>
    !options.isSkyGreeting ||
    (options.isSingleCard && options.getGroupCount() === 1);
