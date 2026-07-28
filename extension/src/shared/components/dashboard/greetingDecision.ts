import type { GreetingSteer } from "@src/shared/components/dashboard/getDashboardEntriesFromQuestions";

/**
 * What a dashboard refresh should do about the greeting: choose one, or leave
 * the one on screen alone - and either way, how the rebuilt list should be
 * steered (see GreetingSteer).
 *
 * Three conditions, each of which silently undoes the rule that the greeting
 * changes only offscreen, which is why they live here rather than inline:
 *
 * - A routine in-view refresh never chooses. It updates the data under a
 *   greeting the user is looking at; re-choosing there would change a card in
 *   front of them, which is the one thing the dashboard must never do.
 * - The "look back" grid has no greeting at all. It must neither record one
 *   (it would remember the grid's centre card, and the dashboard would come
 *   back with a stranger) nor spend a pending re-greet nobody would see.
 * - The re-greet request is taken whenever the greeting is chosen, including
 *   when this dashboard was here to handle the re-greet itself - left standing,
 *   it would re-roll the *next* return too.
 */
export const decideGreeting = (options: {
  /** The "look back" route, which renders the full grid and no greeting. */
  isGridView: boolean;
  /** A re-greet this dashboard is mounted to handle (behind a fading overlay). */
  isReGreet: boolean;
  isGreetingOnScreen: boolean;
  lastGreetingKey: string | undefined;
  /** Reads *and* clears a re-greet that fired while nobody was mounted. */
  takeReGreetRequest: () => boolean;
}): { isChoosingGreeting: boolean; steer: GreetingSteer } => {
  const hold = { hold: options.lastGreetingKey };
  if (options.isGridView) return { isChoosingGreeting: false, steer: hold };
  if (!options.isReGreet && options.isGreetingOnScreen)
    return { isChoosingGreeting: false, steer: hold };

  const wasReGreetedWhileAway = options.takeReGreetRequest();
  return {
    isChoosingGreeting: true,
    steer:
      options.isReGreet || wasReGreetedWhileAway
        ? { avoid: options.lastGreetingKey }
        : hold,
  };
};
