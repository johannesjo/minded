import { createSignal, onCleanup, onMount } from "solid-js";
import {
  ANDROID_EV_RESUME,
  androidInterface,
} from "@src/dataInterface/android/androidInterface";

/**
 * Live "is the home-screen sun widget placed?" state, shared by every surface
 * that offers the widget as a place (the onboarding picker row, the denied-path
 * offer, the dashboard invitation gate).
 *
 * The observed launcher state is the single source of truth — never an intent
 * flag: a checkbox can't place a widget, so nothing here pretends one did. The
 * signal re-reads on resume (returning from the launcher) and, after a pin
 * request, polls briefly — the pin dialog is a system sheet that may not
 * background the activity, so resume alone can miss the confirmation.
 */

// The pin dialog usually resolves within seconds; poll a little past that and
// then rely on the resume re-read (the state also self-corrects on next entry).
const PIN_POLL_INTERVAL_MS = 1000;
const PIN_POLL_MAX_MS = 20_000;

/** Older native shells don't expose the widget bridge; hide the offer there. */
export const isWidgetPinAvailable = (): boolean =>
  typeof androidInterface.isWidgetPlaced === "function" &&
  typeof androidInterface.requestPinWidget === "function";

export const readIsWidgetPlaced = (): boolean => {
  try {
    return androidInterface.isWidgetPlaced?.() === true;
  } catch {
    return false;
  }
};

export const createWidgetPlacement = () => {
  const [getIsPlaced, setIsPlaced] = createSignal(readIsWidgetPlaced());
  let pollT: NodeJS.Timeout | undefined;

  const refresh = () => setIsPlaced(readIsWidgetPlaced());

  const stopPolling = () => {
    if (pollT) {
      clearInterval(pollT);
      pollT = undefined;
    }
  };

  /**
   * Open the system pin dialog. Returns false when the launcher can't pin (the
   * caller shows the manual instruction instead). Polls the placement state
   * while the dialog is (maybe) up, so the UI confirms without a resume.
   */
  const requestPin = (): boolean => {
    let isShown = false;
    try {
      isShown = androidInterface.requestPinWidget?.() === true;
    } catch {
      isShown = false;
    }
    if (!isShown) return false;

    stopPolling();
    const startedAt = Date.now();
    pollT = setInterval(() => {
      refresh();
      if (getIsPlaced() || Date.now() - startedAt > PIN_POLL_MAX_MS) {
        stopPolling();
      }
    }, PIN_POLL_INTERVAL_MS);
    return true;
  };

  onMount(() => {
    refresh();
    window.addEventListener(ANDROID_EV_RESUME, refresh);
    onCleanup(() => {
      window.removeEventListener(ANDROID_EV_RESUME, refresh);
      stopPolling();
    });
  });

  return { getIsPlaced, refresh, requestPin };
};
