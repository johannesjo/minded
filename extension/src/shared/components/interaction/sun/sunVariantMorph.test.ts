import { sunHaloTransition } from "./sunVariantMorph";

// createVariantMorph itself is an effect + timer; Jest runs Solid's server
// build (testEnvironment: node), where effects never fire, so only the pure
// half is covered here.
describe("sunHaloTransition", () => {
  it("eases the halo on the face's turn only while morphing", () => {
    expect(sunHaloTransition(true)).toBe(
      "box-shadow var(--dur-sky-turn) var(--ease-sky-turn) var(--sky-turn-delay, 0ms)",
    );
    expect(sunHaloTransition(false)).toBe("box-shadow 160ms ease-out");
  });
});
