import { readFileSync } from "fs";
import { resolve } from "path";

const source = (relativePath: string): string =>
  readFileSync(resolve(process.cwd(), relativePath), "utf8");

/**
 * Guards for the iOS app-lifecycle wiring, which can't be felt locally (iOS
 * builds only on CI, see RELEASING.md) and so regresses silently.
 */
describe("iOS main lifecycle", () => {
  it("keeps onboarding mounted while the app is backgrounded", () => {
    // Step 1 of onboarding sends the user to the Home Screen to add the
    // widget, so every first run backgrounds the app mid-flow. The isHide
    // swap unmounts what it covers; if it outranked onboarding, the flow
    // restarted at the welcome on each return and could not be completed by
    // anyone who followed its own instructions. The onboarding branch must
    // therefore come before the hide branch.
    const main = source("src/ios/main/MainIOS.tsx");
    const onboardingBranch = main.indexOf(
      "getIsShowOnboarding() || getIsShowWidgetSetup()",
    );
    const hideBranch = main.indexOf("getIsHide()");

    expect(onboardingBranch).toBeGreaterThan(-1);
    expect(hideBranch).toBeGreaterThan(-1);
    expect(onboardingBranch).toBeLessThan(hideBranch);
  });

  it("binds the resume refresh to an event the native shell dispatches", () => {
    // The native shell only dispatches WILL_ENTER_FOREGROUND,
    // DID_BECOME_ACTIVE, and DID_ENTER_BACKGROUND (MainViewController's
    // dispatchJSEvent). A resume handler bound to any other name never fires.
    const main = source("src/ios/main/MainIOS.tsx");
    const iosInterface = source("src/dataInterface/ios/iosInterface.ts");
    const native = source("ios/App/App/MainViewController.swift");

    expect(main).not.toContain("IOS_EV_RESUME");
    expect(iosInterface).not.toContain("iosAppResume");
    expect(main).toMatch(
      /addEventListener\(IOS_WILL_ENTER_FOREGROUND[\s\S]{0,1200}refresh\(\)/,
    );
    for (const evName of [
      "WILL_ENTER_FOREGROUND",
      "DID_BECOME_ACTIVE",
      "DID_ENTER_BACKGROUND",
    ]) {
      expect(native).toContain(`dispatchJSEvent(evName: "${evName}")`);
      expect(iosInterface).toContain(`"${evName}"`);
    }
  });
});
