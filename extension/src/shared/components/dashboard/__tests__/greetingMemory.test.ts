import { setOpenedGreetingKey, takeOpenedGreetingKey } from "../greetingMemory";

describe("the greeting the user walked into", () => {
  beforeEach(() => setOpenedGreetingKey(undefined));

  it("is handed to the return that follows", () => {
    setOpenedGreetingKey("b");
    expect(takeOpenedGreetingKey()).toBe("b");
  });

  it("holds for that one return only - the next arrival greets freshly", () => {
    setOpenedGreetingKey("b");
    takeOpenedGreetingKey();
    expect(takeOpenedGreetingKey()).toBeUndefined();
  });

  it("leaves an arrival that opened nothing to its own fresh pick", () => {
    expect(takeOpenedGreetingKey()).toBeUndefined();
  });
});
