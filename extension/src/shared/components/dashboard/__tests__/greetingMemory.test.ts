import { setOpenedGreetingKey, takeReturnGreeting } from "../greetingMemory";

type Card = { key: string };
const keyOf = (c: Card) => c.key;
const GROUPS: Card[] = [{ key: "a" }, { key: "b" }, { key: "c" }];

describe("returning to the greeting you opened", () => {
  beforeEach(() => setOpenedGreetingKey(undefined));

  it("greets with the same card the user walked into", () => {
    setOpenedGreetingKey("b");
    expect(takeReturnGreeting(GROUPS, keyOf)).toEqual({ key: "b" });
  });

  it("holds for that one return only - the next arrival greets freshly", () => {
    setOpenedGreetingKey("b");
    takeReturnGreeting(GROUPS, keyOf);
    expect(takeReturnGreeting(GROUPS, keyOf)).toBeUndefined();
  });

  it("leaves an arrival that opened nothing to its own fresh pick", () => {
    expect(takeReturnGreeting(GROUPS, keyOf)).toBeUndefined();
  });

  it("falls back to a fresh pick when the opened card is gone", () => {
    // e.g. its last answer was deleted in the page just visited
    setOpenedGreetingKey("b");
    expect(takeReturnGreeting([{ key: "a" }], keyOf)).toBeUndefined();
  });
});
