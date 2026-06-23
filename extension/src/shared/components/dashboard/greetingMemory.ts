// Remembers which tile last greeted the user on the dashboard so the next
// arrival can surface a different one. Module-level state (not persisted): it
// survives route navigations within a session — which is exactly when "landing
// on the dashboard" repeats — and harmlessly resets on a full reload, where a
// fresh random greeting is fine anyway.
let lastGreetingKey: string | undefined;

export const getLastGreetingKey = (): string | undefined => lastGreetingKey;

export const setLastGreetingKey = (key: string | undefined): void => {
  lastGreetingKey = key;
};
