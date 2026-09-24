import {
  createSkipCheckInFlow,
  type SkipCheckInFlowDeps,
  type SkipCheckInStore,
} from "./skipCheckInFlow";

jest.mock("@src/dataInterface/commonSyncDataInterface", () => ({
  countInterventionSkip: jest.fn(),
  resetInterventionSkips: jest.fn(),
  saveSkipCheckInChoice: jest.fn(),
}));

const createStore = (): jest.Mocked<SkipCheckInStore> => ({
  countSkip: jest.fn().mockResolvedValue(undefined),
  resetSkips: jest.fn().mockResolvedValue(undefined),
  saveChoice: jest.fn().mockResolvedValue(undefined),
});

const setup = (overrides: Partial<SkipCheckInFlowDeps> = {}) => {
  const store = createStore();
  const deps: SkipCheckInFlowDeps = {
    isCounted: () => true,
    hasEngaged: () => false,
    isCheckIn: () => false,
    depart: jest.fn(() => 700),
    continueWith: jest.fn(),
    store,
    ...overrides,
  };
  return { store, deps, flow: createSkipCheckInFlow(deps) };
};

describe("createSkipCheckInFlow", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  describe("recordPass", () => {
    it("survives a synchronous storage throw", () => {
      const { store, flow } = setup();
      store.countSkip.mockImplementation(() => {
        throw new Error("Extension was reloaded");
      });
      const error = jest.spyOn(console, "error").mockImplementation(() => {});
      expect(() => flow.recordPass()).not.toThrow();
      error.mockRestore();
    });

    it("counts continuing without having done the prompt", () => {
      const { store, flow } = setup();
      flow.recordPass();
      expect(store.countSkip).toHaveBeenCalledTimes(1);
    });

    it("does not count continuing after doing the prompt", () => {
      const { store, flow } = setup({ hasEngaged: () => true });
      flow.recordPass();
      expect(store.countSkip).not.toHaveBeenCalled();
    });

    it("never counts on the dashboard, or on the check-in itself", () => {
      const dashboard = setup({ isCounted: () => false });
      dashboard.flow.recordPass();
      expect(dashboard.store.countSkip).not.toHaveBeenCalled();

      const checkIn = setup({ isCheckIn: () => true });
      checkIn.flow.recordPass();
      expect(checkIn.store.countSkip).not.toHaveBeenCalled();
    });
  });

  describe("leave", () => {
    it("starts the count over, then closes", () => {
      const { store, flow } = setup();
      const close = jest.fn();
      flow.leave(close);
      expect(store.resetSkips).toHaveBeenCalledTimes(1);
      expect(close).toHaveBeenCalledTimes(1);
    });

    it("still closes on the dashboard, without touching the count", () => {
      const { store, flow } = setup({ isCounted: () => false });
      const close = jest.fn();
      flow.leave(close);
      expect(store.resetSkips).not.toHaveBeenCalled();
      expect(close).toHaveBeenCalledTimes(1);
    });
  });

  describe("choose", () => {
    it("stores the choice, departs, and only then hands over", async () => {
      const { store, deps, flow } = setup();
      const done = flow.choose("later");

      expect(store.saveChoice).toHaveBeenCalledWith("later");
      expect(deps.depart).toHaveBeenCalledTimes(1);
      expect(deps.continueWith).not.toHaveBeenCalled();

      await jest.advanceTimersByTimeAsync(700);
      await done;
      expect(deps.continueWith).toHaveBeenCalledWith("later");
    });

    it("tells the leave which choice it is (a week off leaves no Little Sun)", () => {
      const { deps, flow } = setup();
      void flow.choose("off");
      expect(deps.depart).toHaveBeenCalledWith("off");
    });

    it("still lets the user in when storage throws synchronously", async () => {
      const { store, deps, flow } = setup();
      store.saveChoice.mockImplementation(() => {
        throw new Error("Extension was reloaded");
      });
      const error = jest.spyOn(console, "error").mockImplementation(() => {});

      const done = flow.choose("later");
      await jest.advanceTimersByTimeAsync(700);
      await done;

      expect(deps.continueWith).toHaveBeenCalledWith("later");
      error.mockRestore();
    });

    it("still lets the user in when the choice can't be stored", async () => {
      const { store, deps, flow } = setup();
      store.saveChoice.mockRejectedValue(new Error("quota"));
      const error = jest.spyOn(console, "error").mockImplementation(() => {});

      const done = flow.choose("off");
      await jest.advanceTimersByTimeAsync(700);
      await done;

      expect(deps.continueWith).toHaveBeenCalledWith("off");
      error.mockRestore();
    });

    it("takes only the first choice", async () => {
      const { store, deps, flow } = setup();
      const first = flow.choose("as_now");
      void flow.choose("off");
      await jest.advanceTimersByTimeAsync(700);
      await first;

      expect(store.saveChoice).toHaveBeenCalledTimes(1);
      expect(deps.continueWith).toHaveBeenCalledTimes(1);
      expect(deps.continueWith).toHaveBeenCalledWith("as_now");
    });

    it("does not hand over once the intervention is gone", async () => {
      const { deps, flow } = setup();
      void flow.choose("later");
      flow.dispose();
      await jest.advanceTimersByTimeAsync(700);

      expect(deps.continueWith).not.toHaveBeenCalled();
    });
  });
});
