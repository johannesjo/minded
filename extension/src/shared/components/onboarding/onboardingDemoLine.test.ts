import { matchWidgetLine } from "@src/shared/components/interaction/interactionCommonHelpers";
import { ONBOARDING_DEMO_LINE } from "./onboardingDemoLine";

describe("ONBOARDING_DEMO_LINE (the first pause a new user meets)", () => {
  // An unrecognised line is silently ignored and the random pick runs - which
  // for a brand-new user is always a typed-answer question. Copy drift in the
  // cue list must fail here instead.
  it("lands on a one-tap NOTICE cue, never a question", () => {
    expect(matchWidgetLine(ONBOARDING_DEMO_LINE)?.mode).toBe("NOTICE");
  });
});
