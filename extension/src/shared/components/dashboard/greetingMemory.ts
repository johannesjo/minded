// What greeted the user on the dashboard, and what they walked into from it.
// Module-level state (not persisted): it survives route navigations within a
// session - which is exactly when "landing on the dashboard" repeats - and
// harmlessly resets on a full reload, where a fresh random greeting is fine
// anyway.

// The tile that last greeted the user, so the next arrival can surface a
// different one.
let lastGreetingKey: string | undefined;

export const getLastGreetingKey = (): string | undefined => lastGreetingKey;

export const setLastGreetingKey = (key: string | undefined): void => {
  lastGreetingKey = key;
};

// The greeting the user deliberately *walked into* - they tapped the single
// greeting card and opened its page. Coming back from there is a return, not a
// fresh arrival: the card you just looked at should still be the card that
// greets you. Swapping it for another one in that moment reads as "wasn't there
// something else here?", which is not how a calm greeting should behave. Kept
// apart from lastGreetingKey (which steers arrivals *away* from a repeat).
let openedGreetingKey: string | undefined;

export const setOpenedGreetingKey = (key: string | undefined): void => {
  openedGreetingKey = key;
};

// Read *and* cleared: the pin only ever holds for the one return it was set
// for, so the arrival after that re-greets as usual.
export const takeOpenedGreetingKey = (): string | undefined => {
  const key = openedGreetingKey;
  openedGreetingKey = undefined;
  return key;
};
