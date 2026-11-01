import { readFileSync } from "fs";
import { resolve } from "path";
import {
  getWebOnboardingSunSettle,
  WEB_ONBOARDING_SKY_SUN_SCALE,
  type WebOnboardingSunAnchors,
  type WebOnboardingSunState,
} from "./onboardingWebSunSettle";
import { resolveInitialOnboardingVisibility } from "../../newTabInitialState";

const anchors = (
  overrides: Partial<WebOnboardingSunAnchors> = {},
): WebOnboardingSunAnchors => ({
  heroYFromBottom: 400,
  skyYFromBottom: 700,
  companionYFromBottom: 44,
  ...overrides,
});

const at = (
  step: number,
  overrides: Partial<WebOnboardingSunState> = {},
): WebOnboardingSunState => ({
  step,
  isLeaving: false,
  isPracticing: false,
  ...overrides,
});

const HERO = { anchorYPxFromBottom: 400, scale: 1, breathe: false };
const SKY = {
  anchorYPxFromBottom: 700,
  scale: WEB_ONBOARDING_SKY_SUN_SCALE,
  breathe: false,
};

const source = (relativePath: string): string =>
  readFileSync(resolve(process.cwd(), relativePath), "utf8");

describe("web onboarding sun continuity", () => {
  it("falls through to the route shell when the storage read throws synchronously", async () => {
    await expect(
      resolveInitialOnboardingVisibility(() => {
        throw new Error("extension context was reloaded");
      }),
    ).resolves.toBe(false);
  });

  it("keeps one persistent onboarding sun instead of mounting a sun per step", () => {
    const component = source(
      "src/pages/newtab/components/onboardingWeb/OnboardingWeb.tsx",
    );

    expect(component.match(/<OnboardingSunLayer\b/g)).toHaveLength(1);
    expect(component).not.toMatch(/<OnboardingSun\b/);
  });

  it("folds the configured interstitial into the onboarding's final beat", () => {
    const onboarding = source(
      "src/pages/newtab/components/onboardingWeb/OnboardingWeb.tsx",
    );
    const newTab = source("src/pages/newtab/NewTab.tsx");

    expect(onboarding).toMatch(/getShownStep\(\) === READY_STEP/);
    expect(onboarding).toMatch(/is ready/i);
    expect(newTab).not.toMatch(/getIsShowInfo|infoBox|is now configured/);
  });

  it("does not leave onboarding when its completion marker fails to save", () => {
    const onboarding = source(
      "src/pages/newtab/components/onboardingWeb/OnboardingWeb.tsx",
    );

    expect(onboarding).not.toMatch(/\.catch\(\(\) => undefined\)/);
    expect(onboarding).toMatch(/completionError/);
    expect(onboarding).toMatch(/role="alert"/);
    expect(onboarding).toMatch(
      /next === getStep\(\)[\s\S]{0,80}getIsLeaving\(\)[\s\S]{0,80}getIsSavingCompletion\(\)/,
    );
    expect(onboarding).toMatch(/isNoGoBack=\{getIsSavingCompletion\(\)\}/);
  });

  it("offers the advertised sun pause to keyboard users", () => {
    const layer = source(
      "src/shared/components/onboarding/OnboardingSunLayer.tsx",
    );
    const sun = source("src/shared/components/interaction/sun/Sun.tsx");

    expect(layer).toMatch(/Open a mindful pause/);
    expect(sun).toMatch(/onKeyDown=/);
    expect(sun).toMatch(/tabIndex=/);
  });

  it("lets the pause be felt before explaining it where the companion exists", () => {
    const layer = source(
      "src/shared/components/onboarding/OnboardingSunLayer.tsx",
    );
    const demo = source(
      "src/shared/components/onboarding/createOnboardingSunDemo.ts",
    );
    const onboardings = [
      source("src/android/components/onboardingAndroid/OnboardingAndroid.tsx"),
      source("src/ios/components/onboardingIOS/OnboardingIOS.tsx"),
    ];

    expect(layer).toContain("onPauseExperienced?: () => void;");
    expect(demo).toContain("opts.onPauseExperienced?.()");
    for (const onboarding of onboardings) {
      expect(onboarding).toContain("getHasExperiencedPause");
      expect(onboarding).toContain("setHasExperiencedPause(true)");
      expect(onboarding).toContain("Tap the {companionWord()}.");
      expect(onboarding).toContain("isVisible={getHasExperiencedPause()}");
    }
  });

  // Desktop has no tap-to-pause companion - its only sun is the intervention -
  // so the welcome rehearses the intervention's two outcomes instead.
  it("teaches the intervention's gestures on desktop, in its own words", () => {
    const onboarding = source(
      "src/pages/newtab/components/onboardingWeb/OnboardingWeb.tsx",
    );
    const hints = source(
      "src/pages/newtab/components/onboardingWeb/InterventionHints.tsx",
    );
    const intervention = source(
      "src/shared/components/interaction/InteractionCommon.tsx",
    );

    expect(onboarding).toContain('welcomeGesture="intervention"');
    expect(onboarding).toContain("<InterventionHints");
    expect(onboarding).not.toContain("Tap the {companionWord()}.");
    // One copy for both surfaces, so the rehearsal can't drift from the real
    // thing.
    for (const file of [hints, intervention]) {
      expect(file).toContain("letGoHint(");
      expect(file).toContain("continueHint(");
      expect(file).toContain("SUN_HINT_STAGGER_MS");
    }
  });

  it("rests on the hero, setup sky, final hero, then dashboard companion", () => {
    expect(getWebOnboardingSunSettle(at(0), anchors())).toEqual(HERO);
    expect(getWebOnboardingSunSettle(at(1), anchors())).toEqual(SKY);
    expect(getWebOnboardingSunSettle(at(2), anchors())).toEqual(HERO);
    expect(
      getWebOnboardingSunSettle(at(2, { isLeaving: true }), anchors()),
    ).toMatchObject({ anchorYPxFromBottom: 44 });
  });

  it("lifts the disc into the sky while the welcome's continue practice shows", () => {
    expect(
      getWebOnboardingSunSettle(at(0, { isPracticing: true }), anchors()),
    ).toEqual(SKY);
  });

  it("does not flash at centre before the welcome hero is measured", () => {
    expect(
      getWebOnboardingSunSettle(at(0), anchors({ heroYFromBottom: null })),
    ).toBeNull();
  });

  it("keeps the setup-sky rest until the final hero slot is measured", () => {
    expect(
      getWebOnboardingSunSettle(at(2), anchors({ heroYFromBottom: null })),
    ).toEqual(SKY);
  });
});

describe("web onboarding rehearses both intervention outcomes", () => {
  const onboarding = () =>
    source("src/pages/newtab/components/onboardingWeb/OnboardingWeb.tsx");
  const layer = () =>
    source("src/shared/components/onboarding/OnboardingSunLayer.tsx");

  it("lets go with drag/fling and continues with the real tap count or Enter", () => {
    expect(onboarding()).toMatch(
      /advanceFromWelcome=\{\(\) => changeStep\(WEB_ONBOARDING_SITES_STEP\)\}/,
    );
    expect(onboarding()).toContain(
      'onWelcomeContinue={() => changeWelcomeView("choosing")}',
    );
    // Same threshold and keyboard key as the real intervention sun.
    expect(layer()).toMatch(
      /isInterventionWelcome\(\)\s*\?\s*SUN_TAP_THRESHOLD/,
    );
    expect(layer()).toMatch(
      /isInterventionWelcome\(\)\s*\?\s*continueFromWelcome/,
    );
    expect(layer()).toMatch(/Press Enter to continue/);
  });

  it("gives keyboard users a way past the let-go they can't perform", () => {
    expect(onboarding()).toMatch(
      /<Btn\s+plain\s+onClick=\{\(\) => changeStep\(WEB_ONBOARDING_SITES_STEP\)\}/,
    );
  });

  it("holds the welcome disc still while the practice is open", () => {
    const demo = source(
      "src/shared/components/onboarding/createOnboardingSunDemo.ts",
    );

    expect(onboarding()).toContain("getIsWelcomeHeld={isPracticing}");
    expect(demo).toContain("opts.getIsWelcomeHeld?.() !== true");
  });

  it("keeps Android and iOS on the tap-to-pause welcome", () => {
    for (const file of [
      "src/android/components/onboardingAndroid/OnboardingAndroid.tsx",
      "src/ios/components/onboardingIOS/OnboardingIOS.tsx",
    ]) {
      expect(source(file)).not.toMatch(/welcomeGesture=/);
    }
  });

  it("shows the real time choices but starts nothing from them", () => {
    const component = onboarding();

    expect(component).toContain("<TimeSelection");
    expect(component).toContain(
      'onSelectTime={() => changeWelcomeView("chosen")}',
    );
    expect(component).toContain("onCancel={cancelTimePractice}");
    expect(component).not.toMatch(
      /onSetSessionLimit|sessionLimit|setSyncData|closeTab|window\.close/,
    );
  });

  it("saves completion before trying the real site, and stays on failure", () => {
    const component = onboarding();
    const tryOnSite = component.slice(
      component.indexOf("const tryOnSite"),
      component.indexOf("const leaveToDashboard"),
    );

    expect(tryOnSite).toMatch(
      /await saveCompletion\("site"\)[\s\S]*window\.location\.assign/,
    );
    expect(tryOnSite).toMatch(
      /!\(await saveCompletion\("site"\)\)[^\n]*return;/,
    );
    expect(component).toMatch(/try it on \$\{getTrySite\(\)\}/);
    // The offer only exists once a site was actually saved.
    expect(component).toContain("setTrySite(savedHosts[0] ?? null)");
    expect(component).toMatch(/\{getTrySite\(\) && \(/);
  });

  // Under reduced motion the let-go's hand-off to the next rest snaps (it never
  // reads as "settling"), and the off-screen completion used to run anyway,
  // dragging the disc out of sight on the website step.
  it("lets a settle that lands during the release cancel its off-screen exit", () => {
    const sun = source("src/shared/components/interaction/sun/Sun.tsx");

    expect(sun.match(/settleChangeCount\+\+;/g)).toHaveLength(2);
    expect(sun.match(/if \(!hasSettleTakenOver\(\)\)/g)).toHaveLength(2);
    expect(sun).not.toMatch(/if \(!getIsSettlingIntoRole\(\)\)/);
  });

  it("skips the exit fades under reduced motion", () => {
    const component = onboarding();
    const tryOnSite = component.slice(
      component.indexOf("const tryOnSite"),
      component.indexOf("const leaveToDashboard"),
    );

    expect(tryOnSite).toMatch(/if \(!prefersReducedMotion\(\) && chromeEl\)/);
  });
});

describe("narrow onboarding geometry", () => {
  it("does not impose a 320px content minimum inside padded onboarding", () => {
    const styles = source(
      "src/pages/newtab/components/onboardingWeb/OnboardingWeb.module.scss",
    );

    expect(styles).not.toMatch(/min-width:\s*320px/);
    expect(styles).toMatch(/min-width:\s*0/);
  });

  it("lets step dots and connecting lines contract on a 320px viewport", () => {
    const styles = source("src/shared/components/ui/Stepper.module.scss");

    expect(styles).toMatch(/--step-size:\s*clamp\(44px,/);
    expect(styles).toMatch(/--line-width:\s*clamp\(/);
    expect(styles).toMatch(/max-width:\s*100%/);
  });
});
