import { createRoot, createSignal } from "solid-js";

import { createDashboardCardInteractivity } from "../dashboardCardInteractivity";

describe("collapsed dashboard card interactivity", () => {
  it("follows live group-count changes while the same sky greeting remains mounted", () => {
    createRoot((dispose) => {
      const [getGroupCount, setGroupCount] = createSignal(2);
      const getIsInteractive = createDashboardCardInteractivity({
        hasId: true,
        isSingleCard: true,
        isSkyGreeting: true,
        getGroupCount,
      });

      expect(getIsInteractive()).toBe(false);

      setGroupCount(1);
      expect(getIsInteractive()).toBe(true);

      setGroupCount(2);
      expect(getIsInteractive()).toBe(false);
      dispose();
    });
  });
});
