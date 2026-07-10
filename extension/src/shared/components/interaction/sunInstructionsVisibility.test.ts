import { shouldShowSunInstructionsOverlay } from "./sunInstructionsVisibility";

const base = {
  showSunInstructions: true,
  isCompletionStarted: false,
  showPostSunOverlay: false,
};

describe("shouldShowSunInstructionsOverlay", () => {
  it("shows the instructions on the tap-the-sun step", () => {
    expect(shouldShowSunInstructionsOverlay(base)).toBe(true);
  });

  it("hides them before the step is reached", () => {
    expect(
      shouldShowSunInstructionsOverlay({ ...base, showSunInstructions: false }),
    ).toBe(false);
  });

  // Regression: the instructions overlay used to stay mounted through the
  // intent/time choices, stacked above them, flickering over / stealing taps from
  // the "How long do you want?" options (see predicate docs). It must unmount the
  // moment the post-sun choices/breath overlay is up.
  it("hides them once the post-sun overlay (choices/breath) is showing", () => {
    expect(
      shouldShowSunInstructionsOverlay({ ...base, showPostSunOverlay: true }),
    ).toBe(false);
  });

  it("hides them while the sun's terminal animation runs", () => {
    expect(
      shouldShowSunInstructionsOverlay({ ...base, isCompletionStarted: true }),
    ).toBe(false);
  });
});
