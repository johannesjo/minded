import { getRndEntry } from "@src/util/getRndEntry";
import { Quote, QUOTES } from "@src/shared/data/quotes";

// What is greeting the user on the dashboard, so it can hold still while they
// are in the app and only ever change offscreen. Module-level state (not
// persisted): it survives route navigations within a session - which is exactly
// what "coming back to the dashboard" is - and harmlessly resets on a full
// reload (a new tab), where a fresh greeting is right anyway.

// The tile currently greeting the user. Two jobs, both about the same card:
// a return to the dashboard keeps it (see holdGreeting), and when the greeting
// *is* deliberately re-rolled, it's the tile the new pick steers away from.
let lastGreetingKey: string | undefined;

export const getLastGreetingKey = (): string | undefined => lastGreetingKey;

export const setLastGreetingKey = (key: string | undefined): void => {
  lastGreetingKey = key;
};

// The quote currently greeting the user, drawn once and then held. RndQuote
// draws at random on every mount, so without this a held quote greeting would
// still change its words on the way back: the card holds still but the greeting
// doesn't, which is the jolt we're removing.
let greetingQuote: Quote | undefined;

export const getGreetingQuote = (): Quote => {
  if (!greetingQuote) greetingQuote = getRndEntry(QUOTES);
  return greetingQuote;
};

// A deliberate re-greet fired (RE_GREET_DASHBOARD_HIDDEN_EV) - the next greeting
// is a fresh pick rather than the held one. Recorded as a flag because the
// dashboard is usually *not mounted* when it fires: an interaction closing over
// another page, or Android backgrounding the app while the user is somewhere
// else entirely. Without it, the re-roll would land in a void and the user
// would come back hours later to the greeting they left.
let isReGreetRequested = false;

export const requestReGreet = (): void => {
  isReGreetRequested = true;
  greetingQuote = undefined;
};

// Read *and* cleared, so one re-greet frees exactly one greeting.
export const takeReGreetRequest = (): boolean => {
  const wasRequested = isReGreetRequested;
  isReGreetRequested = false;
  return wasRequested;
};
