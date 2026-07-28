import {
  getGreetingQuote,
  requestReGreet,
  takeReGreetRequest,
} from "../greetingMemory";
import { mockRandom } from "@src/test-utils/mockHelpers";

describe("the greeting the user currently has", () => {
  beforeEach(() => {
    // Clear both the flag and the held quote (requestReGreet frees the quote,
    // takeReGreetRequest clears the flag it just set).
    requestReGreet();
    takeReGreetRequest();
  });
  afterEach(() => jest.restoreAllMocks());

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

  it("keeps the same quote across returns, and only re-draws on a re-greet", () => {
    // The card holding still isn't enough - a quote that re-randomised on every
    // mount would still change the greeting's words on the way back.
    mockRandom(0);
    const quote = getGreetingQuote();
    mockRandom(0.99);
    expect(getGreetingQuote()).toBe(quote);

    // Freed by a re-greet, it draws again (offscreen, like the tile itself).
    requestReGreet();
    expect(getGreetingQuote()).not.toBe(quote);
  });
});
