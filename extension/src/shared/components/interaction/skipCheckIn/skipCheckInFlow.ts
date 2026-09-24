import {
  countInterventionSkip,
  resetInterventionSkips,
  saveSkipCheckInChoice,
} from "@src/dataInterface/commonSyncDataInterface";
import type { SkipCheckInChoice } from "@src/shared/components/interaction/skipCheckIn/skipCheckIn";

export interface SkipCheckInStore {
  countSkip: () => Promise<void>;
  resetSkips: () => Promise<void>;
  saveChoice: (choice: SkipCheckInChoice) => Promise<void>;
}

export interface SkipCheckInFlowDeps {
  /** Real interventions only: the dashboard pause was opened on purpose. */
  isCounted: () => boolean;
  /**
   * The prompt was done (answered / completed) before continuing - or a guided
   * breath was sat through, which can't be tapped past on autopilot.
   */
  hasEngaged: () => boolean;
  /** The check-in itself is showing - its choices are answers, not passes. */
  isCheckIn: () => boolean;
  /**
   * Start the leave choreography for this choice; returns how long it runs
   * (ms). A week off leaves no Little Sun behind, so its sun fades out with
   * the surface instead of departing to the Little Sun's rest.
   */
  depart: (choice: SkipCheckInChoice) => number;
  /** Hand over to the platform once the choice is stored and the leave ran. */
  continueWith: (choice: SkipCheckInChoice) => void;
  store?: SkipCheckInStore;
}

const defaultStore: SkipCheckInStore = {
  countSkip: countInterventionSkip,
  resetSkips: resetInterventionSkips,
  saveChoice: saveSkipCheckInChoice,
};

const logFailure = (what: string) => (error: unknown) =>
  console.error(`Failed to ${what}`, error);

// Storage can throw synchronously (the extension's patch does once its context
// is gone after a reload). A throw must never skip the hand-over below and
// strand the user on the check-in, so it is caught like a rejection - while
// the write itself still starts right away.
const settle = (write: () => Promise<void>, what: string): Promise<void> => {
  try {
    return write().catch(logFailure(what));
  } catch (error) {
    logFailure(what)(error);
    return Promise.resolve();
  }
};

/**
 * The intervention's side of the skip check-in (skipCheckIn.ts), kept out of
 * InteractionCommon: counting passes, starting over on any engagement or
 * leave, and handing a check-in choice over to the platform.
 */
export const createSkipCheckInFlow = (deps: SkipCheckInFlowDeps) => {
  const store = deps.store ?? defaultStore;
  let departTimeout: ReturnType<typeof setTimeout> | undefined;
  let isChoosing = false;
  let isDisposed = false;

  /** Going into the app without having done the prompt. */
  const recordPass = () => {
    if (!deps.isCounted() || deps.hasEngaged() || deps.isCheckIn()) return;
    void settle(store.countSkip, "count skip");
  };

  /** The prompt was done, or the user left: the pause wasn't passed by. */
  const recordEngagedOrLeft = () => {
    if (!deps.isCounted()) return;
    void settle(store.resetSkips, "reset skips");
  };

  /** Every way out of the app runs through here, so leaving always resets. */
  const leave = (close: () => void) => {
    recordEngagedOrLeft();
    close();
  };

  /**
   * Every choice continues into the app. The platform only takes over once
   * the choice is stored - the native side reads it to decide what shows - and
   * the leave has run. A failed write still lets the user in rather than
   * trapping them here; with no answer stored, the check-in simply comes back
   * after a fresh run of passes (showing it already started the count over).
   */
  const choose = async (choice: SkipCheckInChoice): Promise<void> => {
    if (isChoosing) return;
    isChoosing = true;
    const saved = settle(
      () => store.saveChoice(choice),
      "save skip check-in choice",
    );
    const departMs = deps.depart(choice);
    const departed = new Promise<void>((resolve) => {
      departTimeout = setTimeout(resolve, departMs);
    });
    await Promise.all([saved, departed]);
    if (!isDisposed) deps.continueWith(choice);
  };

  const dispose = () => {
    isDisposed = true;
    if (departTimeout) clearTimeout(departTimeout);
  };

  return { recordPass, recordEngagedOrLeft, leave, choose, dispose };
};
