import { readFileSync } from "fs";
import { resolve } from "path";

/**
 * The skip check-in's rules are unit-tested (skipCheckIn.test.ts,
 * skipCheckInFlow.test.ts), but they only matter if the surfaces actually call
 * them - and most of those call sites live in the untested orchestrators and in
 * native Kotlin that Jest can't run. These guards pin the wiring, so dropping a
 * hook (a pass no longer counted, the tap no longer off on the check-in, a
 * locked phone counting toward a "later" week) fails here instead of silently.
 * jest runs with cwd = extension/.
 */

const read = (relPath: string): string =>
  readFileSync(resolve(process.cwd(), relPath), "utf8");

const INTERACTION = "src/shared/components/interaction/";
const ANDROID = "../android/app/src/main/java/com/minded/minded/";

/** The body of `const <name> = (...) => { ... };` at two-space indent. */
const constFnBody = (source: string, name: string): string => {
  const start = source.indexOf(`  const ${name} = `);
  if (start === -1) throw new Error(`could not find ${name}`);
  const end = source.indexOf("\n  };\n", start);
  if (end === -1) throw new Error(`could not find the end of ${name}`);
  return source.slice(start, end);
};

/** The body of a Kotlin `fun <name>(` up to the next member at 4-space indent. */
const ktFunBody = (source: string, name: string): string => {
  const start = source.search(new RegExp(`fun ${name}\\(`));
  if (start === -1) throw new Error(`could not find fun ${name}`);
  const rest = source.slice(start + 1);
  const next = rest.search(
    /\n {4}(?:(?:private|internal|override|public) )?fun /,
  );
  return next === -1 ? rest : rest.slice(0, next);
};

describe("skip check-in wiring", () => {
  describe("InteractionCommon", () => {
    const source = read(`${INTERACTION}InteractionCommon.tsx`);

    it("counts a pass on every way into the app", () => {
      expect(constFnBody(source, "handleTimeSelection")).toContain(
        "skipFlow.recordPass()",
      );
      expect(constFnBody(source, "handleSkip")).toContain(
        "skipFlow.recordPass()",
      );
    });

    it("starts over on doing the prompt, the breath, and every way out", () => {
      expect(constFnBody(source, "onInteractionSuccess")).toContain(
        "skipFlow.recordEngagedOrLeft()",
      );
      const breath = constFnBody(source, "handleBreathPauseComplete");
      expect(breath).toContain("hasBreathed = true");
      expect(breath).toContain("skipFlow.recordEngagedOrLeft()");
      expect(constFnBody(source, "runTerminalOutcome")).toContain(
        "skipFlow.leave(close)",
      );
      expect(constFnBody(source, "settleForBedtime")).toContain(
        "skipFlow.leave(close)",
      );
      expect(source).toContain(
        "onLeaveNow={() => skipFlow.leave(props.onFlingAway)}",
      );
    });

    it("keeps the tap, and its keyboard equivalent, off on the check-in", () => {
      expect(constFnBody(source, "handleSunTap")).toContain("!isCheckIn()");
      expect(source).toContain(
        "isTapEnabled={!props.isFromDashboard && !isCheckIn()}",
      );
      expect(constFnBody(source, "getSunAccessibility")).toContain(
        "!isCheckIn()",
      );
    });

    it("counts only where the router could ask, and cleans up", () => {
      expect(source).toContain("!(props.isFromDashboard ?? isMain())");
      expect(source).toContain("skipFlow.dispose()");
      expect(source).toContain(
        "onSkipCheckInChoice={(choice) => void skipFlow.choose(choice)}",
      );
    });
  });

  describe("web", () => {
    it("never lets Escape slip past the check-in, only while it shows", () => {
      expect(read(`${INTERACTION}InteractionWeb.tsx`)).toContain(
        '(currentMode === "SKIP_CHECK_IN" && !getIsShowLittleSun())',
      );
    });

    it("always continues after a choice, even if starting over fails", () => {
      const body = constFnBody(
        read(`${INTERACTION}InteractionWeb.tsx`),
        "handleSkipCheckInChoice",
      );
      expect(body).toMatch(/finally \{\s*setIsShowLittleSun\(true\);/);
    });

    it("keeps a week off quiet on load and in a running Little Sun", () => {
      const contentScript = read("src/pages/content/content-script.tsx");
      expect(contentScript).toContain(
        'isInterventionPauseActive(initialSyncData, "off"',
      );
      expect(contentScript).toContain(
        'isInterventionPauseActive(syncData, "off"',
      );
      expect(read(`${INTERACTION}LittleSun.tsx`)).toContain(
        'isInterventionPauseActive(syncData, "off"',
      );
    });

    it("hands back only a grace this Little Sun counted, from the effective session", () => {
      const littleSun = read(`${INTERACTION}LittleSun.tsx`);
      expect(littleSun).toMatch(
        /getLittleSunTimerSource\([\s\S]*?hasCountedGrace,\s*\)/,
      );
      expect(littleSun).toContain("hasCountedGrace = true;");
      expect(littleSun).toContain("getEffectiveSessionDurationS(");
    });
  });

  describe("check-in and settings UI", () => {
    it("ignores choices until they've faded in", () => {
      const checkIn = read(
        `${INTERACTION}skipCheckIn/SkipCheckInInteraction.tsx`,
      );
      expect(checkIn).toMatch(
        /setTimeout\(\s*\(\) => setIsArmed\(true\),\s*SKIP_CHECK_IN_ARM_MS,?\s*\)/,
      );
      expect(checkIn).toContain("if (!getIsArmed() || getIsChosen()) return;");
    });

    it("confirms 'Resume now' only after the write went through", () => {
      const settings = read(
        "src/shared/components/settings/InterventionPauseSettings.tsx",
      );
      expect(settings).toMatch(
        /await clearInterventionPause\(\);[\s\S]*?setIsResumed\(true\);/,
      );
    });
  });

  describe("Android (native, not run by Jest)", () => {
    it("hands a later week back on unlocked time only", () => {
      const littleSun = read(`${ANDROID}overlay/LittleSunWindow.kt`);
      expect(littleSun).toContain("keyguardManager?.isKeyguardLocked != true");
      expect(littleSun).toContain(
        "unlockedSessionAfterTick(unlockedSessionS, isUnlocked)",
      );
      expect(littleSun).toContain(
        "shouldHandBackToPause(activePauseAtSessionS, unlockedSessionS, isUnlocked)",
      );
      expect(littleSun).toContain("activePauseAtSessionS = pauseAtSessionS");
    });

    it("routes and continues a chosen week", () => {
      const controller = read(`${ANDROID}overlay/OverlayControllerService.kt`);
      expect(controller).toContain(
        "is OverlayDecision.ShowLittleSunUntilPause",
      );
      expect(controller).toContain(
        "littleSunOverlayWindow.pauseAtSessionS = littleSunPauseAtSessionS",
      );
      expect(controller).toContain(
        "currentUnlockedSessionS = currentUnlockedSessionS",
      );
      expect(controller).toContain(
        "interventionPauseKind = activeInterventionPauseKind(",
      );
      const bridge = read(
        `${ANDROID}overlay/InteractionWindowJavaScriptInterface.kt`,
      );
      expect(bridge).toMatch(
        /@JavascriptInterface\s+fun continueAfterInterventionPause\(\)/,
      );
    });

    it("keeps the loading-sun shortcut off only when the check-in is due, never at bedtime", () => {
      const controller = read(`${ANDROID}overlay/OverlayControllerService.kt`);
      expect(ktFunBody(controller, "isSkipCheckInDueNow")).toContain(
        "SleepWindDownWindow.resolveNightId(syncData.cfg) != null",
      );
      const window = read(`${ANDROID}overlay/InteractionWindow.kt`);
      expect(
        window.match(/isSkipCheckInDue = isSkipCheckInDue\.value/g),
      ).toHaveLength(2);
      expect(ktFunBody(window, "escapeFreshArrival")).toContain(
        "countInterventionSkip()",
      );
    });

    it("never counts a native pass at bedtime", () => {
      const prefs = read(`${ANDROID}data/SharedPreferenceService.kt`);
      expect(ktFunBody(prefs, "countInterventionSkip")).toContain(
        "isBedtime = SleepWindDownWindow.resolveNightId(",
      );
    });
  });
});
