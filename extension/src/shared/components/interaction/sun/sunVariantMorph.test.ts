import { sunHaloTransition } from "./sunVariantMorph";

// createVariantMorph itself is an effect + timer; Jest runs Solid's server
// build (testEnvironment: node), where effects never fire, so only the pure
// half is covered here.
describe("sunHaloTransition", () => {
  it("eases the halo on the face's gentle beat only while morphing", () => {
    expect(sunHaloTransition(true)).toBe(
      "box-shadow var(--dur-gentle) var(--ease-out)",
    );
    expect(sunHaloTransition(false)).toBe("box-shadow 160ms ease-out");
  });
});
