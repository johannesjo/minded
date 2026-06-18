import { shouldIgnoreStaleSuccess } from "./interactionSuccessGuard";

const state = (
  overrides: Partial<Parameters<typeof shouldIgnoreStaleSuccess>[0]>,
) => ({
  hasAnswered: false,
  showSunInstructions: false,
  showPostSunOverlay: false,
  ...overrides,
});

describe("shouldIgnoreStaleSuccess", () => {
  it("honours a success while the question is still showing", () => {
    expect(shouldIgnoreStaleSuccess(state({}))).toBe(false);
  });

  it("ignores a duplicate success once one was already handled", () => {
    expect(shouldIgnoreStaleSuccess(state({ hasAnswered: true }))).toBe(true);
  });

  it("ignores a success that arrives during the sun instructions", () => {
    expect(shouldIgnoreStaleSuccess(state({ showSunInstructions: true }))).toBe(
      true,
    );
  });

  // The skip-to-choices path: the user triple-tapped past the question to the
  // intent/time choices, so a late MoodCheckin save timer must not disarm them.
  // `hasAnswered` was never set on this path, so the overlay flag is what guards.
  it("ignores a late success once the choices overlay is showing", () => {
    expect(shouldIgnoreStaleSuccess(state({ showPostSunOverlay: true }))).toBe(
      true,
    );
  });
});
