import { decideGreeting } from "../greetingDecision";

describe("deciding the greeting on a dashboard refresh", () => {
  const decide = (
    options: Partial<Parameters<typeof decideGreeting>[0]> & {
      takeReGreetRequest?: () => boolean;
    } = {},
  ) => {
    const takes: number[] = [];
    const result = decideGreeting({
      isGridView: false,
      isReGreet: false,
      isGreetingOnScreen: false,
      lastGreetingKey: "GoodPlans",
      takeReGreetRequest: () => {
        takes.push(1);
        return false;
      },
      ...options,
    });
    return { ...result, takeCount: takes.length };
  };

  it("holds the greeting when the screen opens again", () => {
    const { isChoosingGreeting, steer } = decide();
    expect(isChoosingGreeting).toBe(true);
    expect(steer).toEqual({ hold: "GoodPlans" });
  });

  it("leaves a greeting the user is looking at alone", () => {
    // A routine in-view data refresh: re-choosing here would change a card in
    // front of the user, which is the one thing the dashboard must never do.
    const { isChoosingGreeting, takeCount } = decide({
      isGreetingOnScreen: true,
    });
    expect(isChoosingGreeting).toBe(false);
    expect(takeCount).toBe(0);
  });

  it("rolls a fresh one on a re-greet this dashboard is handling", () => {
    const { isChoosingGreeting, steer } = decide({ isReGreet: true });
    expect(isChoosingGreeting).toBe(true);
    expect(steer).toEqual({ avoid: "GoodPlans" });
  });

  it("spends a re-greet that fired while nothing was mounted", () => {
    const { isChoosingGreeting, steer } = decide({
      takeReGreetRequest: () => true,
    });
    expect(isChoosingGreeting).toBe(true);
    expect(steer).toEqual({ avoid: "GoodPlans" });
  });

  it("takes the request even when it handled the re-greet itself", () => {
    // Left standing, it would re-roll the *next* return too.
    const { takeCount } = decide({ isReGreet: true });
    expect(takeCount).toBe(1);
  });

  it("never chooses or spends a re-greet in the 'look back' grid", () => {
    // The grid has no greeting: recording one would remember its centre card,
    // and the dashboard would come back with a tile that never greeted anyone.
    const { isChoosingGreeting, steer, takeCount } = decide({
      isGridView: true,
      isReGreet: true,
      takeReGreetRequest: () => true,
    });
    expect(isChoosingGreeting).toBe(false);
    expect(steer).toEqual({ hold: "GoodPlans" });
    expect(takeCount).toBe(0);
  });
});
