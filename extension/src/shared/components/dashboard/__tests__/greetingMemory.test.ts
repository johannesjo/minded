import { requestReGreet, takeReGreetRequest } from "../greetingMemory";

describe("the greeting the user currently has", () => {
  beforeEach(() => takeReGreetRequest());

  it("is held until a re-greet frees it", () => {
    expect(takeReGreetRequest()).toBe(false);
    requestReGreet();
    expect(takeReGreetRequest()).toBe(true);
  });

  it("frees exactly one greeting per re-greet", () => {
    requestReGreet();
    takeReGreetRequest();
    expect(takeReGreetRequest()).toBe(false);
  });
});
