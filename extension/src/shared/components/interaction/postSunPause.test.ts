import {
  getPostSunPauseSeconds,
  STRONG_FRICTION_BREATH_PAUSE_SECONDS,
} from "./postSunPause";

describe("post-sun pause helpers", () => {
  it("requires a short pause only for strong friction", () => {
    expect(getPostSunPauseSeconds("soft")).toBe(0);
    expect(getPostSunPauseSeconds("normal")).toBe(0);
    expect(getPostSunPauseSeconds("strong")).toBe(
      STRONG_FRICTION_BREATH_PAUSE_SECONDS,
    );
  });
});
