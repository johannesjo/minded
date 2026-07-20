import { readFileSync } from "fs";
import { resolve } from "path";
import {
  getWebOnboardingSunSettle,
  WEB_ONBOARDING_SKY_SUN_SCALE,
  type WebOnboardingSunAnchors,
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

    expect(onboarding).toMatch(/getShownStep\(\) === 2/);
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

  it("rests on the hero, setup sky, final hero, then dashboard companion", () => {
    expect(getWebOnboardingSunSettle(0, false, anchors())).toEqual({
      anchorYPxFromBottom: 400,
      scale: 1,
      breathe: false,
    });
    expect(getWebOnboardingSunSettle(1, false, anchors())).toEqual({
      anchorYPxFromBottom: 700,
      scale: WEB_ONBOARDING_SKY_SUN_SCALE,
      breathe: false,
    });
    expect(getWebOnboardingSunSettle(2, false, anchors())).toEqual({
      anchorYPxFromBottom: 400,
      scale: 1,
      breathe: false,
    });
    expect(getWebOnboardingSunSettle(2, true, anchors())).toMatchObject({
      anchorYPxFromBottom: 44,
    });
  });

  it("does not flash at centre before the welcome rest is measured", () => {
    expect(
      getWebOnboardingSunSettle(0, false, anchors({ heroYFromBottom: null })),
    ).toBeNull();
  });

  it("keeps the setup-sky rest until the final hero slot is measured", () => {
    expect(
      getWebOnboardingSunSettle(2, false, anchors({ heroYFromBottom: null })),
    ).toEqual({
      anchorYPxFromBottom: 700,
      scale: WEB_ONBOARDING_SKY_SUN_SCALE,
      breathe: false,
    });
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
