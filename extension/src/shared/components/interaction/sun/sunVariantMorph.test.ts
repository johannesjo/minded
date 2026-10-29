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

  it("lands the halo with a settle glide, never ahead of it", () => {
    expect(sunHaloTransition(false, 650)).toBe(
      "box-shadow 650ms var(--ease-sky-turn)",
    );
    // The sun↔moon turn still wins; no glide falls back to the quick bloom.
    expect(sunHaloTransition(true, 650)).toBe(sunHaloTransition(true));
    expect(sunHaloTransition(false, null)).toBe(sunHaloTransition(false));
  });
});
