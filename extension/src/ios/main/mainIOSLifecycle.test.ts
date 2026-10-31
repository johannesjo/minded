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

  it("posts to the message handlers the native shell registers", () => {
    // WKWebView drops a post to an unregistered handler without a sound, so a
    // name drifting on either side would leave the sun mute to touch (haptics),
    // the launch sky on the wrong face (loading sky) or held until its cap
    // (first paint).
    const native = source("ios/App/App/MainViewController.swift");
    const haptics = source(
      "src/shared/components/interaction/sun/sunAnimationUtils.ts",
    );
    const main = source("src/ios/main/MainIOS.tsx");
    const loadingPage = source("src/ios/main/index.html");

    expect(native).toContain('messageName = "mindedHaptic"');
    expect(native).toMatch(
      /userContentController\.add\(\s*SunHaptics\(\),\s*name: SunHaptics\.messageName/,
    );
    expect(haptics).toContain("messageHandlers?.mindedHaptic");
    // Every name the web sends is one SunHaptics answers.
    for (const type of ["light", "medium", "heavy"]) {
      expect(native).toContain(`"${type}": UIImpactFeedbackGenerator`);
    }
    expect(haptics).toContain('mindedHaptic?.postMessage("tick")');
    expect(native).toContain('type == "tick"');

    expect(native).toContain('sunReadyMessage = "mindedSunReady"');
    expect(native).toContain("add(self, name: Self.sunReadyMessage)");
    expect(main).toContain("messageHandlers?.mindedSunReady?.postMessage");

    expect(native).toContain('loadingSkyMessage = "mindedLoadingSky"');
    expect(native).toContain("add(self, name: Self.loadingSkyMessage)");
    expect(loadingPage).toContain(
      'messageHandlers.mindedLoadingSky.postMessage(night ? "dark" : "light")',
    );
    expect(native).toContain('(message.body as? String) == "dark"');
  });

  it("holds the launch screen's own sky over the loading app", () => {
    // The overlay replaces the system launch screen, so the two must be the
    // same image drawn the same way - otherwise the hand-off itself is a cut.
    const storyboard = source("ios/App/App/Base.lproj/LaunchScreen.storyboard");
    const native = source("ios/App/App/MainViewController.swift");
    const imageset = JSON.parse(
      source("ios/App/App/Assets.xcassets/LaunchSky.imageset/Contents.json"),
    ) as { images: { appearances?: { value: string }[] }[] };

    expect(storyboard).toContain('image="LaunchSky"');
    expect(storyboard).toContain('contentMode="scaleToFill"');
    expect(native).toContain('launchSkyImage = "LaunchSky"');
    expect(native).toContain("sky.contentMode = .scaleToFill");
    // A sky for each system appearance - the one switch a launch screen reads.
    expect(
      imageset.images.some((image) =>
        image.appearances?.some((a) => a.value === "dark"),
      ),
    ).toBe(true);
    // No disc of its own: the only sun is the app's, easing in under it.
    expect(storyboard).not.toContain("Splash");
  });

  it("eases every cold launch in, not only the widget's", () => {
    // A plain launch from the app icon cut from the launch screen to a WebView
    // still loading when the fade was gated on the widget; it must stay
    // unconditional - neither viewDidLoad nor the fade itself may ask how the
    // app was launched.
    const native = source("ios/App/App/MainViewController.swift");
    const viewDidLoad = native.slice(
      native.indexOf("override func viewDidLoad()"),
      native.indexOf("@objc func handleOpenSun"),
    );
    const installLaunchFade = native.slice(
      native.indexOf("private func installLaunchFade()"),
      native.indexOf("private func launchSkyView("),
    );

    expect(viewDidLoad).toContain("installLaunchFade()");
    expect(viewDidLoad).not.toMatch(/if [^\n]*\{\s*installLaunchFade\(\)/);
    expect(installLaunchFade).toContain("view.addSubview(overlay)");
    expect(installLaunchFade).not.toContain("launchedFromSunWidget");
  });
});
