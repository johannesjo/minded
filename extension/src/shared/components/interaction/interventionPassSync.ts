import { bro } from "@src/util/browser";

/**
 * Cross-tab "the user got past the pause on this site" signal for the browser
 * extension. A chosen time already reaches every tab through `activeTimer`;
 * a skip leaves nothing behind, so without this the same site's other tabs
 * keep standing in the doorway the user just walked through.
 *
 * Local, not sync storage: a skip on one device must not dismiss a pause on
 * another.
 */
const INTERVENTION_PASSED_KEY = "interventionPassed";
// One per content-script instance, so a tab ignores its own announcement.
const TAB_TOKEN = `${Date.now()}-${Math.random()}`;

interface InterventionPassed {
  host: string;
  ts: number;
  tabToken: string;
}

/**
 * Whether a stored signal is a pass on `host` from another tab made after
 * this tab's pause appeared (`shownSinceTS`). Comparing against the showing,
 * not the clock, keeps late deliveries (a frozen background tab) valid and
 * old signals written back by updateHostsEntry's read-modify-write inert.
 */
export const isPassedInOtherTab = (
  value: unknown,
  opts: { host: string; ownTabToken: string; shownSinceTS: number },
): boolean => {
  if (!value || typeof value !== "object") return false;
  const passed = value as Partial<InterventionPassed>;
  return (
    passed.host === opts.host &&
    passed.tabToken !== opts.ownTabToken &&
    typeof passed.ts === "number" &&
    passed.ts > opts.shownSinceTS
  );
};

/** Tell the site's other tabs the pause was passed here. */
export const announceInterventionPassed = (host: string): void => {
  const value: InterventionPassed = {
    host,
    ts: Date.now(),
    tabToken: TAB_TOKEN,
  };
  // Called on the way out of the pause: a failure here (e.g. an orphaned
  // content script after an update can throw synchronously) must never keep
  // this tab from moving on.
  try {
    bro.storage.local
      .set({ [INTERVENTION_PASSED_KEY]: value })
      .catch((error: unknown) =>
        console.error("Failed to announce the passed pause", error),
      );
  } catch (error) {
    console.error("Failed to announce the passed pause", error);
  }
};

/**
 * Calls `onPassed` when another tab passes the pause on `host` after
 * `getShownSinceTS()`. Also re-reads on tab return: another tab's
 * updateHostsEntry can overwrite the signal before its change event fires
 * here. Returns the unsubscribe.
 */
export const onInterventionPassedInOtherTab = (
  host: string,
  getShownSinceTS: () => number,
  onPassed: () => void,
): (() => void) => {
  const check = (value: unknown) => {
    const opts = {
      host,
      ownTabToken: TAB_TOKEN,
      shownSinceTS: getShownSinceTS(),
    };
    if (isPassedInOtherTab(value, opts)) onPassed();
  };
  const onStorage = (
    changes: Record<string, { newValue?: unknown }>,
    areaName: string,
  ) => {
    const change = changes[INTERVENTION_PASSED_KEY];
    if (areaName === "local" && change) check(change.newValue);
  };
  const onVisible = () => {
    if (document.hidden) return;
    bro.storage.local
      .get(INTERVENTION_PASSED_KEY)
      .then((d) => check(d[INTERVENTION_PASSED_KEY]))
      .catch((error: unknown) =>
        console.error("Failed to read the passed pause", error),
      );
  };
  bro.storage.onChanged.addListener(onStorage);
  document.addEventListener("visibilitychange", onVisible);
  return () => {
    bro.storage.onChanged.removeListener(onStorage);
    document.removeEventListener("visibilitychange", onVisible);
  };
};
