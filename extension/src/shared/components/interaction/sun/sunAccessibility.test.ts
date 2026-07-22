import { readFileSync } from "fs";
import { resolve } from "path";
import {
  getInteractiveSunAccessibility,
  getSunKeyboardActivation,
  shouldHonorSunFocusRequest,
} from "./sunAccessibility";
import type { SunPhase } from "./sunSettle";

describe("interactive sun accessibility", () => {
  const focusElement = (role?: string, insideInert = false) =>
    ({
      getAttribute: (name: string) => (name === "role" ? role : null),
      closest: (selector: string) =>
        selector === "[inert]" && insideInert ? {} : null,
    }) as unknown as Element;

  it("honors delayed focus only while focus still belongs to the handoff", () => {
    const sun = focusElement("button");

    expect(shouldHonorSunFocusRequest(null, sun)).toBe(true);
    expect(shouldHonorSunFocusRequest(sun, sun)).toBe(true);
    expect(shouldHonorSunFocusRequest(focusElement("dialog"), sun)).toBe(true);
    expect(shouldHonorSunFocusRequest(focusElement(undefined, true), sun)).toBe(
      true,
    );
    expect(shouldHonorSunFocusRequest(focusElement("button"), sun)).toBe(false);
  });

  it("offers one keyboard action to continue a regular pause", () => {
    expect(
      getInteractiveSunAccessibility({
        phase: "interactive",
        variant: "sun",
        isFromDashboard: false,
        isWindDown: false,
        isInputEnabled: true,
      }),
    ).toEqual({
      label: "Continue with the sun",
      action: "continue",
    });
  });

  it("names the dashboard's gentle keyboard action", () => {
    expect(
      getInteractiveSunAccessibility({
        phase: "interactive",
        variant: "moon",
        isFromDashboard: true,
        isWindDown: false,
        isInputEnabled: true,
      }),
    ).toEqual({
      label: "Stay a while with the moon",
      action: "stay",
      alternativeAction: {
        label: "Let go with the moon",
        activation: "up",
      },
      description:
        "Press Enter or Arrow Down to stay a while. Press Arrow Up to let go.",
      keyShortcuts: "Enter Space ArrowDown ArrowUp",
    });
  });

  it("maps the announced dashboard shortcuts to both directional rituals", () => {
    expect(getSunKeyboardActivation("Enter", true)).toBe("primary");
    expect(getSunKeyboardActivation(" ", true)).toBe("primary");
    expect(getSunKeyboardActivation("ArrowDown", true)).toBe("down");
    expect(getSunKeyboardActivation("ArrowUp", true)).toBe("up");
    expect(getSunKeyboardActivation("ArrowUp", false)).toBeUndefined();
    expect(getSunKeyboardActivation("Escape", true)).toBeUndefined();
  });

  it("describes the bedtime escape without promising the daytime flow", () => {
    expect(
      getInteractiveSunAccessibility({
        phase: "interactive",
        variant: "moon",
        isFromDashboard: false,
        isWindDown: true,
        isInputEnabled: true,
      }),
    ).toEqual({
      label: "Continue without winding down",
      action: "continue",
    });
  });

  it("keeps every non-interactive phase out of the tab order", () => {
    const nonInteractivePhases: SunPhase[] = [
      "companion",
      "breathing",
      "surfing",
      "resting",
      "departing",
      "dailyQuestions",
      "dailyQuestionsSuccess",
    ];

    for (const phase of nonInteractivePhases) {
      expect(
        getInteractiveSunAccessibility({
          phase,
          variant: "sun",
          isFromDashboard: false,
          isWindDown: false,
          isInputEnabled: true,
        }),
      ).toBeUndefined();
    }
  });

  it("becomes inert as soon as its transition begins", () => {
    expect(
      getInteractiveSunAccessibility({
        phase: "interactive",
        variant: "sun",
        isFromDashboard: false,
        isWindDown: false,
        isInputEnabled: false,
      }),
    ).toBeUndefined();
  });

  it("wires the named action through every active-sun host", () => {
    const source = (relativePath: string): string =>
      readFileSync(resolve(process.cwd(), relativePath), "utf8");
    const sun = source("src/shared/components/interaction/sun/Sun.tsx");
    const shell = source("src/shared/RouteCmp.tsx");
    const interaction = source(
      "src/shared/components/interaction/InteractionCommon.tsx",
    );
    const onboarding = source(
      "src/shared/components/onboarding/OnboardingSunLayer.tsx",
    );
    const dashboardOverlay = source(
      "src/shared/components/dashboard/interactionOverlay/InteractionOverlay.tsx",
    );
    const grounding = source(
      "src/shared/components/interaction/grounding/GroundingOverlay.tsx",
    );
    const letGo = source(
      "src/shared/components/interaction/letGo/LetGoOverlay.tsx",
    );
    const windDown = source(
      "src/shared/components/sleepWindDown/SleepWindDownView.tsx",
    );
    const webOnboarding = source(
      "src/pages/newtab/components/onboardingWeb/OnboardingWeb.tsx",
    );
    const androidOnboarding = source(
      "src/android/components/onboardingAndroid/OnboardingAndroid.tsx",
    );
    const iosOnboarding = source(
      "src/ios/components/onboardingIOS/OnboardingIOS.tsx",
    );

    expect(sun).toContain("props.onKeyboardActivate");
    expect(sun).toMatch(
      /const getIsAccessibleActionEnabled[\s\S]*?shouldAcceptSunPointerStart\(/,
    );
    expect(sun).toMatch(
      /const handleAccessibleActivation[\s\S]*?getIsAccessibleActionEnabled\(\)[\s\S]*?props\.onKeyboardActivate/,
    );
    expect(sun).toMatch(
      /onKeyDown=\{[\s\S]*?event\.repeat[\s\S]*?handleAccessibleActivation\(\)/,
    );
    expect(sun).toMatch(
      /onClick=\{[\s\S]*?event\.detail !== 0[\s\S]*?handleAccessibleActivation\(\)/,
    );
    expect(sun).toContain("aria-disabled");
    expect(shell).toContain("getAccessibleLabel");
    expect(shell).toContain("onKeyboardActivate");
    expect(shell).toContain("onAccessibleActionEnabledChange");
    expect(shell).toContain("<BottomBar inert=");
    expect(shell).toContain("event.detail === 0");
    expect(shell).toContain("requestSunFocus()");
    expect(shell).toContain("focusRequest={getSunFocusRequest()}");
    expect(shell).toContain("ref={companionTapTargetEl}");
    expect(shell).toContain("shouldRestoreCompanionFocus = true");
    expect(sun).toContain("props.focusRequest");
    expect(sun).toContain("sunEl.focus");
    expect(sun).toContain("shouldHonorSunFocusRequest");
    expect(sun).toContain("onAccessibleActionEnabledChange");
    expect(dashboardOverlay).toContain('role="dialog"');
    expect(dashboardOverlay).not.toContain('aria-modal="true"');
    expect(dashboardOverlay).toContain("wrapperEl.focus");
    expect(dashboardOverlay).not.toContain("focusOnMount");
    expect(dashboardOverlay).toContain("tabIndex={-1}");
    expect(interaction).toContain("getInteractiveSunAccessibility");
    expect(interaction).toContain("inert=");
    expect(interaction).toMatch(
      /inert=\{[\s\S]*?getIsFinalAnimation\(\)[\s\S]*?getIsCompletionStarted\(\)/,
    );
    expect(interaction).toContain("focusPostSunOverlay");
    expect(interaction).toContain("focusOnMount");
    expect(interaction).toContain("alternativeAction");
    expect(interaction).toContain("alternativeAction.activation");
    expect(interaction).toContain(
      "disabled={!getIsSunAccessibleActionEnabled()}",
    );
    expect(interaction).toContain(
      "onAccessibleActionEnabledChange: setIsSunAccessibleActionEnabled",
    );
    expect(interaction).toContain(
      "inert={getShowSunInstructions() ? true : undefined}",
    );
    expect(interaction).toMatch(
      /setShowSunInstructions\(true\);[\s\S]*?requestInteractiveSunFocus\(\)/,
    );
    expect(interaction.match(/requestInteractiveSunFocus\(\)/g)).toHaveLength(
      4,
    );
    expect(grounding).toContain("props.focusOnMount");
    expect(letGo).toContain("props.focusOnMount");
    expect(onboarding).toContain("getAccessibleLabel");
    expect(onboarding).toContain("onAccessibleActionEnabledChange");
    expect(onboarding).toContain("props.onPauseVisibilityChange");
    expect(onboarding).toContain("focusRequest={getSunFocusRequest()}");
    expect(windDown).toContain("aria-label={getGoodnightMoonLabel()}");
    expect(windDown).toContain(
      "onKeyboardActivate={handleGoodnightMoonAction}",
    );
    expect(windDown).toContain("a11yAlternateAction");
    for (const host of [webOnboarding, androidOnboarding, iosOnboarding]) {
      expect(host).toContain("getIsPauseOpen()");
      expect(host).toContain("onPauseVisibilityChange={setIsPauseOpen}");
    }
  });
});
