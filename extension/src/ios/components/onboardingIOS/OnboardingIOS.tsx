import ButtonWrapper from "@src/shared/components/ui/ButtonWrapper";
import {
  createEffect,
  createMemo,
  createSignal,
  Match,
  on,
  onCleanup,
  onMount,
  Switch,
} from "solid-js";
// @ts-ignore
import { updateUserCfg } from "@src/dataInterface/commonSyncDataInterface";
import { companionWord } from "@src/shared/addWrapperClasses";
import Btn from "@src/shared/components/ui/Btn";
import { Stepper } from "@src/shared/components/ui/Stepper";
import {
  COMPANION_GLIDE_MS,
  SunSettle,
} from "@src/shared/components/interaction/sun/Sun";
import { sunCompanionSettle } from "@src/shared/components/interaction/sun/sunSettle";
import { setCompanionBottomYPx } from "@src/shared/components/interaction/sun/sunStore";
import { readCompanionBottomPx } from "@src/shared/components/interaction/sun/companionAnchor";
import { OnboardingSunLayer } from "@src/shared/components/onboarding/OnboardingSunLayer";
import {
  fadeOut,
  fadeOutThen,
  PAGE_FADE_MS,
  promiseTimeout,
} from "@src/util/animation";
import { prefersReducedMotion } from "@src/util/prefersReducedMotion";
// @ts-ignore
import styles from "./OnboardingIOS.module.scss";

// Mirrors the Android onboarding's measurement timing: the entrance animation
// carries a slight scale, so re-measure once it has landed.
const ENTRANCE_ANIMATION_MS = 1100;
const ANCHOR_TOLERANCE_PX = 6;

/**
 * The iOS first run — deliberately two steps, because the iOS product is
 * smaller (see docs/ios-platform-fit.md): there are no permissions to ask and
 * no apps to pick. Step 0 is the welcome (the same held disc as Android's,
 * with the same tap-to-pause demo — on iOS the in-app pause IS exactly what
 * the widget tap delivers, so nothing is left un-demoable). Step 1 gives the
 * sun its home: the Home Screen widget, minded's one surface at the glance
 * where scrolling begins. "Later" is first-class; the dashboard invitation
 * (MainIOS) re-offers quietly while no widget is observed.
 */
export const OnboardingIOS = (props: {
  onGoDashboard: () => void;
  /**
   * Where to enter. First run starts at 0; the dashboard's widget invitation
   * re-enters at 1, skipping the welcome the user has already seen.
   */
  initialStep?: number;
}) => {
  // Logical step drives the Stepper and the sun at once; the shown step (what
  // the <Switch> renders) follows the content fade — the one disc morphs
  // through the change instead of popping with it (same as Android).
  const [getStep, setStep] = createSignal<number>(props.initialStep ?? 0);
  const [getShownStep, setShownStep] = createSignal<number>(
    props.initialStep ?? 0,
  );
  const [getIsLeaving, setIsLeaving] = createSignal(false);

  const isReEntry = (props.initialStep ?? 0) > 0;
  // Re-entry starts the disc on the companion anchor the dashboard sun just
  // rested on, then lifts it next frame — the same sun visibly rises out of
  // the bar instead of a second one popping in elsewhere.
  const [getHasLifted, setHasLifted] = createSignal(!isReEntry);

  let contentEl!: HTMLDivElement;
  let chromeEl!: HTMLDivElement;
  let companionProbeEl!: HTMLDivElement;
  let spacerEl: HTMLDivElement | undefined;
  let isStepSwapInFlight = false;
  let isDisposed = false;
  onCleanup(() => {
    isDisposed = true;
  });

  // CSS is the single source of truth for the companion rest; JS reads the
  // resolved px back off the probe (the RouteCmp reanchorCompanion pattern).
  const [getHeroY, setHeroY] = createSignal<number | null>(null);
  const [getCompanionY, setCompanionY] = createSignal<number | null>(null);

  const measureAnchors = () => {
    const companionBottom = readCompanionBottomPx(companionProbeEl);
    if (companionBottom != null) {
      setCompanionY(companionBottom);
      // Keep the store's companion anchor in sync while onboarding owns the
      // screen: a mid-demo companion rest (grounding) must land on the real
      // bar anchor, and the leave hand-off seeds the shell sun's mount point.
      setCompanionBottomYPx(companionBottom);
    }
    if (spacerEl?.isConnected) {
      const rect = spacerEl.getBoundingClientRect();
      setHeroY(window.innerHeight - (rect.top + rect.height / 2));
    } else {
      setHeroY(null);
    }
  };

  createEffect(
    on(getShownStep, () => {
      measureAnchors();
      const raf = requestAnimationFrame(measureAnchors);
      const t = window.setTimeout(measureAnchors, ENTRANCE_ANIMATION_MS);
      onCleanup(() => {
        cancelAnimationFrame(raf);
        clearTimeout(t);
      });
    }),
  );

  onMount(() => {
    window.addEventListener("resize", measureAnchors);
    onCleanup(() => {
      window.removeEventListener("resize", measureAnchors);
    });
    if (isReEntry) {
      requestAnimationFrame(() => setHasLifted(true));
    }
  });

  // Both steps rest the disc full-size on the measured hero spacer — the
  // welcome's centrepiece, and on step 1 the live preview of exactly what the
  // widget looks like (the widget IS this sun, relocated). Leaving glides it
  // onto the companion anchor the dashboard shell sun takes over.
  const getOnboardingSettle = createMemo<SunSettle | null>((prev) => {
    let next: SunSettle | null = null;
    if (getIsLeaving() || !getHasLifted()) {
      const companionY = getCompanionY();
      next = companionY == null ? null : sunCompanionSettle(companionY);
    } else {
      const heroY = getHeroY();
      next =
        heroY == null
          ? null
          : { anchorYPxFromBottom: heroY, scale: 1, breathe: false };
    }
    if (
      prev != null &&
      next != null &&
      prev.scale === next.scale &&
      Math.abs(
        (prev.anchorYPxFromBottom ?? 0) - (next.anchorYPxFromBottom ?? 0),
      ) < ANCHOR_TOLERANCE_PX
    ) {
      // Same rest — keep the object identity so Sun doesn't re-glide.
      return prev;
    }
    return next;
  });

  const changeStep = (next: number) => {
    if (next === getStep() || getIsLeaving()) return;
    setStep(next);
    if (isStepSwapInFlight) return;
    isStepSwapInFlight = true;
    fadeOutThen(contentEl, () => {
      isStepSwapInFlight = false;
      if (isDisposed) return;
      setShownStep(getStep());
      contentEl.style.opacity = "";
      contentEl.style.transition = "";
    });
  };

  // The sole exit: mark the run seen, then the disc glides home to the
  // companion anchor while the chrome fades; the dashboard mounts once it has
  // landed, so the shell sun takes over a disc already resting on its anchor.
  const leaveToDashboard = async () => {
    if (getIsLeaving()) return;
    setIsLeaving(true);
    // Await the completion write before leaving: iOS getSyncData is an uncached
    // Preferences read, so onGoDashboard's refresh() would otherwise re-read the
    // pre-write value and bounce the user straight back into onboarding (worst
    // on the reduced-motion path, which has no glide to hide the race). Android
    // writes this early via its step>=3 effect, so it never hits this.
    // But never let a storage failure trap the user on the onboarding screen:
    // saveSyncDataN already surfaces the error, so we leave regardless — at
    // worst onboarding reappears next launch (the pre-fix behaviour).
    try {
      await updateUserCfg({ isOnboardingComplete: true });
    } catch {
      // already surfaced by handleDataError; fall through to the dashboard
    }
    if (isDisposed) return;
    const companionY = getCompanionY();
    if (companionY != null) setCompanionBottomYPx(companionY);
    if (prefersReducedMotion()) {
      props.onGoDashboard();
      return;
    }
    fadeOut(chromeEl, PAGE_FADE_MS);
    promiseTimeout(COMPANION_GLIDE_MS + 100).then(() => {
      if (!isDisposed) props.onGoDashboard();
    });
  };

  return (
    <div class={styles.wrapper}>
      <div class={styles.chrome} ref={chromeEl}>
        <div class={styles.contentWrapper} ref={contentEl}>
          <Switch>
            <Match when={getShownStep() === 0}>
              <div class={`${styles.step} pageTransitionIn`}>
                <div class={styles.sunSpacer} ref={(el) => (spacerEl = el)} />
                <div class="h2 h2Mindful">
                  Meet <em>minded</em>
                </div>
                <div class="txtSlightlyBigger">
                  <p>
                    This little {companionWord()} is your anchor. Tap it — a
                    calm pause opens, a moment to arrive before you carry on.
                  </p>
                  <p>
                    On iPhone it lives on your Home Screen: a quiet companion at
                    the glance where scrolling begins.
                  </p>
                </div>

                <ButtonWrapper isVisible={true}>
                  <Btn big onClick={() => changeStep(1)}>
                    begin
                  </Btn>
                </ButtonWrapper>
              </div>
            </Match>

            <Match when={getShownStep() >= 1}>
              <div class={`${styles.step} pageTransitionIn`}>
                <div class={styles.sunSpacer} ref={(el) => (spacerEl = el)} />
                <div class="h2 h2Mindful">Give it a home</div>
                <div class="txtSlightlyBigger">
                  <p>
                    Add the {companionWord()} to your Home Screen: press and
                    hold an empty spot, tap <em>Edit</em>, then{" "}
                    <em>Add Widget</em>, and choose <em>minded</em>.
                  </p>
                  <p>
                    It stays quiet — no numbers, no nudges. The sun by day, the
                    moon by night; tapping it opens this pause.
                  </p>
                </div>

                <ButtonWrapper isVisible={true}>
                  <Btn big onClick={leaveToDashboard}>
                    done
                  </Btn>
                </ButtonWrapper>

                <div class={styles.skipWrapper}>
                  <Btn outline onClick={leaveToDashboard}>
                    I'll add it later
                  </Btn>
                </div>
              </div>
            </Match>
          </Switch>
        </div>

        <Stepper
          nrOfSteps={2}
          activeStep={getStep()}
          // Re-entry from the dashboard invitation targets the widget step
          // directly; the welcome is behind us.
          isNoGoBack={isReEntry}
          onSetStep={(step) => changeStep(step)}
        />
      </div>

      {/* The ONE onboarding sun + its tap-to-pause demo (shared with Android).
          The flow supplies its own rests (getOnboardingSettle) and how to
          advance off the welcome. */}
      <OnboardingSunLayer
        getStep={getStep}
        getIsLeaving={getIsLeaving}
        getBaseSettle={getOnboardingSettle}
        advanceFromWelcome={() => changeStep(1)}
      />

      <div class={styles.companionProbe} ref={companionProbeEl} />
    </div>
  );
};

export default OnboardingIOS;
