// Remembers which tile last greeted the user on the dashboard so the next
// arrival can surface a different one. Module-level state (not persisted): it
// survives route navigations within a session - which is exactly when "landing
// on the dashboard" repeats - and harmlessly resets on a full reload, where a
// fresh random greeting is fine anyway.
let lastGreetingKey: string | undefined;

export const getLastGreetingKey = (): string | undefined => lastGreetingKey;

export const setLastGreetingKey = (key: string | undefined): void => {
  lastGreetingKey = key;
};

// The greeting the user deliberately *walked into* - they tapped the single
// greeting card and opened its page. Coming back from there is a return, not a
// fresh arrival: the card you just looked at should still be the card that
// greets you. Swapping it for another one in that moment reads as "wasn't there
// something else here?" - the one thing the calm greeting shouldn't do. Kept
// apart from lastGreetingKey (which steers arrivals *away* from a repeat) and
// consumed by the very next greeting pick, so the arrival after the return
// re-greets as usual.
let openedGreetingKey: string | undefined;

export const setOpenedGreetingKey = (key: string | undefined): void => {
  openedGreetingKey = key;
};

// The card to return to, if it's still on the dashboard - read *and* cleared,
// so the pin only ever holds for the one return it was set for. A card that
// vanished in the meantime (its last answer deleted in the page just visited)
// simply yields undefined and the caller falls back to a fresh pick.
export const takeReturnGreeting = <T>(
  groups: T[],
  getKey: (group: T) => string,
): T | undefined => {
  const key = openedGreetingKey;
  openedGreetingKey = undefined;
  return key === undefined
    ? undefined
    : groups.find((group) => getKey(group) === key);
};
