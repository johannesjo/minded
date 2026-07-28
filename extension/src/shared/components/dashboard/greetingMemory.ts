import { RE_GREET_DASHBOARD_HIDDEN_EV } from "@src/ev.const";

// What is greeting the user on the dashboard, and when it is allowed to change.
// Module-level state (not persisted): it survives route navigations within a
// session - which is exactly what "coming back to the dashboard" is - and
// harmlessly resets on a full reload (a new tab), where a fresh greeting is
// right anyway.

// The tile currently greeting the user. Two jobs, both about the same card: a
// return to the dashboard keeps it, and when the greeting *is* deliberately
// re-rolled, it's the tile the new pick steers away from (see GreetingSteer).
let lastGreetingKey: string | undefined;

export const getLastGreetingKey = (): string | undefined => lastGreetingKey;

export const setLastGreetingKey = (key: string | undefined): void => {
  lastGreetingKey = key;
};

// A deliberate re-greet fired (RE_GREET_DASHBOARD_HIDDEN_EV) and no dashboard
// was mounted to act on it - so the next one to open picks a fresh greeting
// instead of holding. Recorded rather than acted on because the dashboard is
// often not mounted when the event fires: an interaction closing over another
// page, the app backgrounded from settings or a card's page, onboarding on
// screen. Without it the re-roll would land in a void, and the user would come
// back to the greeting they left however long ago.
let isReGreetRequested = false;

export const requestReGreet = (): void => {
  isReGreetRequested = true;
};

// Read *and* cleared, so one re-greet frees exactly one greeting.
export const takeReGreetRequest = (): boolean => {
  const wasRequested = isReGreetRequested;
  isReGreetRequested = false;
  return wasRequested;
};

// Listen at module scope, not from a component: every surface that can be on
// screen when a re-greet fires would otherwise have to remember to record it,
// and the ones that don't (onboarding, the missing-capability screen - neither
// renders the router) would silently swallow it. Imported by the dashboard, so
// this runs wherever a dashboard can exist, and being registered at import it
// always records before any mounted component handles the same event. Guarded
// for the DOM-less test env.
if (typeof window !== "undefined") {
  window.addEventListener(RE_GREET_DASHBOARD_HIDDEN_EV, requestReGreet);
}

// How long the app must have been in the foreground before backgrounding it
// frees the greeting: a quick open-and-leave keeps the current tile, so a
// barely glanced-at greeting isn't churned.
const MIN_FOREGROUND_FOR_REGREET_MS = 90_000;

// Seeded with "now" for the cold launch, whose foreground event may fire before
// the shell attaches its listener.
let foregroundedAtTs = Date.now();

/** The app became visible (Android onStart / iOS willEnterForeground). */
export const markAppForegrounded = (): void => {
  foregroundedAtTs = Date.now();
};

/**
 * The app went genuinely offscreen (Android onStop / iOS didEnterBackground) -
 * re-greet from here, so a fresh tile is already in place by the time the user
 * comes back and the card is never seen to change (calm is the product; a card
 * only ever changes offscreen). Both mobile shells go through this so neither
 * can drift: the WebView isn't reloaded on return on either, so without it the
 * greeting would hold for the life of the app.
 */
export const reGreetAfterRealLook = (): void => {
  if (Date.now() - foregroundedAtTs >= MIN_FOREGROUND_FOR_REGREET_MS) {
    window.dispatchEvent(new Event(RE_GREET_DASHBOARD_HIDDEN_EV));
  }
};
