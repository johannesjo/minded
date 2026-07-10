import { MissingCapabilityView } from "@src/android/components/missingCapabilities/MissingCapabilities";
import { SettingsAndroid } from "@src/android/components/settingsAndroid/SettingsAndroid";
import ButtonWrapper from "@src/shared/components/ui/ButtonWrapper";
import {
  createEffect,
  createMemo,
  createSignal,
  Match,
  on,
  onCleanup,
  onMount,
  Show,
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
import { setCompanionBottomYPx } from "@src/shared/components/interaction/sun/sunStore";
import { readCompanionBottomPx } from "@src/shared/components/interaction/sun/companionAnchor";
import { OnboardingSunLayer } from "@src/shared/components/onboarding/OnboardingSunLayer";
import { getOnboardingSunSettle } from "./onboardingSunSettle";
import {
  createWidgetPlacement,
  isWidgetPinAvailable,
} from "@src/android/util/widgetPlacement";
import {
  fadeOut,
  fadeOutThen,
  PAGE_FADE_MS,
  promiseTimeout,
} from "@src/util/animation";
import { prefersReducedMotion } from "@src/util/prefersReducedMotion";
// @ts-ignore
import styles from "./OnboardingAndroid.module.scss";

// The entrance animation (standardPageTransitionIn, 1000ms) carries a slight
// scale, so a spacer measured mid-entrance sits a few px off its resting spot.
// Re-measure just after it lands; the settle memo tolerates the gap meanwhile.
const ENTRANCE_ANIMATION_MS = 1100;
// Two measurements of the same rest can differ by a few px while the entrance
// is still landing; within this band they're the same target, so the disc
// never chases sub-visible corrections with full settle glides.
const ANCHOR_TOLERANCE_PX = 6;

export const OnboardingAndroid = (props: {
  onGoDashboard: () => void;
  /**
   * Where to enter the flow. First run starts at 0 (the sun intro); the
   * dashboard's "finish setup" invitation re-enters at 1 (the places picker),
   * skipping the welcome the user has already seen.
   */
  initialStep?: number;
}) => {
  // The logical step drives the Stepper and the sun's rest immediately; the
  // shown step (what the <Switch> renders) follows once the departing content
  // has faded out — so steps hand over softly and the one disc morphs through
  // the change instead of popping with it.
  const [getStep, setStep] = createSignal<number>(props.initialStep ?? 0);
  const [getShownStep, setShownStep] = createSignal<number>(
    props.initialStep ?? 0,
  );
  const [getPermissionNotGiven, setPermissionNotGiven] =
    createSignal<boolean>(false);
  const [getIsLeaving, setIsLeaving] = createSignal(false);
  // Whether the picker's save chose any apps. Decides the route after step 1
  // (apps → the permission chores; none → straight to "ready") and shrinks the
  // stepper for the widget-only run — the permission dots simply don't exist
  // for a user who never asked for the in-app interruption.
  const [getHasApps, setHasApps] = createSignal(false);

  // The widget as a place: observed launcher state for the denied-path offer
  // ("Almost there" → the costless yes). The picker row has its own instance.
  const widgetPlacement = createWidgetPlacement();
  const [getIsShowManualPinHint, setIsShowManualPinHint] = createSignal(false);

  const isReEntry = (props.initialStep ?? 0) > 0;
  // Re-entry starts the disc on the companion anchor the dashboard sun just
  // rested on, then lifts it to the sky next frame — the same sun visibly
  // rises out of the bar instead of a second one popping in elsewhere.
  const [getHasLifted, setHasLifted] = createSignal(!isReEntry);

  let contentEl!: HTMLDivElement;
  let chromeEl!: HTMLDivElement;
  let skyProbeEl!: HTMLDivElement;
  let companionProbeEl!: HTMLDivElement;
  let spacerEl: HTMLDivElement | undefined;
  let isStepSwapInFlight = false;
  let isDisposed = false;
  onCleanup(() => {
    isDisposed = true;
  });

  // --- Sun anchors: CSS is the single source of truth for the computed rests
  // (the sky band, the companion bar anchor); JS only reads the resolved px
  // back off probe elements — the same pattern as RouteCmp's reanchorCompanion.
  const [getHeroY, setHeroY] = createSignal<number | null>(null);
  const [getSkyY, setSkyY] = createSignal<number | null>(null);
  const [getCompanionY, setCompanionY] = createSignal<number | null>(null);

  const measureAnchors = () => {
    const companionBottom = readCompanionBottomPx(companionProbeEl);
    if (companionBottom != null) {
      setCompanionY(companionBottom);
      // Keep the shared store's companion anchor in sync while onboarding owns
      // the screen: a mid-demo companion rest (the grounding offer parks the
      // disc beneath its invitation) must land on the real bar anchor, not the
      // store's pre-mount default.
      setCompanionBottomYPx(companionBottom);
    }
    const skyTop = skyProbeEl.getBoundingClientRect().top;
    setSkyY(window.innerHeight - skyTop);
    if (spacerEl?.isConnected) {
      const rect = spacerEl.getBoundingClientRect();
      setHeroY(window.innerHeight - (rect.top + rect.height / 2));
    } else {
      setHeroY(null);
    }
  };

  createEffect(
    on(getShownStep, () => {
      measureAnchors(); // the new step's spacer (or its absence) applies at once
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
    window.addEventListener("androidSafeAreaChanged", measureAnchors);
    onCleanup(() => {
      window.removeEventListener("resize", measureAnchors);
      window.removeEventListener("androidSafeAreaChanged", measureAnchors);
    });
    if (isReEntry) {
      // One painted frame at the companion rest, then rise.
      requestAnimationFrame(() => setHasLifted(true));
    }
  });

  const getSunSettle = createMemo<SunSettle | null>((prev) => {
    const next = getOnboardingSunSettle(
      {
        step: getStep(),
        isLeaving: getIsLeaving(),
        isAwaitingLift: !getHasLifted(),
        isPermissionNotGiven: getPermissionNotGiven(),
      },
      {
        heroYFromBottom: getHeroY(),
        skyYFromBottom: getSkyY(),
        companionYFromBottom: getCompanionY(),
      },
    );
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
    setStep(next); // Stepper + sun move now; the content follows the fade
    if (isStepSwapInFlight) return; // the in-flight swap picks up the new step
    isStepSwapInFlight = true;
    fadeOutThen(contentEl, () => {
      isStepSwapInFlight = false;
      if (isDisposed) return;
      setShownStep(getStep());
      // The arriving step eases in via its own pageTransitionIn; the wrapper
      // itself must be fully visible again at once.
      contentEl.style.opacity = "";
      contentEl.style.transition = "";
    });
  };

  // The sole exit: the disc glides home to the companion anchor while the
  // chrome fades, and the dashboard mounts only once it has landed — so the
  // shell sun takes over a disc already resting on its own anchor.
  const leaveToDashboard = () => {
    if (getIsLeaving()) return;
    setIsLeaving(true);
    // Seed the shell store with the rest this disc lands on: RouteCmp's shell
    // sun mounts by snapping to the store's companion anchor, so handing over
    // the px measured off the same CSS var makes the swap pixel-continuous
    // instead of seed-then-correct.
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

  // Deferral: meeting the sun must never be gated behind the setup chore.
  // Skipping marks onboarding seen (so it won't reappear) and drops the user
  // on the dashboard; the incomplete state is recoverable from there.
  const handleSkipForNow = async () => {
    await updateUserCfg({ isOnboardingComplete: true });
    leaveToDashboard();
  };

  // The picker decides the route: apps chosen → the permission chores those
  // apps need; only the home-screen place (or nothing) chosen → straight to
  // "ready", never showing a permission screen that has nothing to enable.
  const handlePlacesSaved = (selectedApps: string[]) => {
    setHasApps(selectedApps.length > 0);
    changeStep(selectedApps.length > 0 ? 2 : 4);
  };

  // Widget-only runs never visit the permission steps, so their dots don't
  // exist: the flow is welcome → places → ready (3), not 5 with a jump.
  const isShortFlow = () => getStep() >= 4 && !getHasApps();
  const displayNrOfSteps = () => (isShortFlow() ? 3 : 5);
  const displayActiveStep = () => (isShortFlow() ? 2 : getStep());

  // The denied path's costless alternative: pin the widget right there.
  const handleOfferPin = () => {
    if (!widgetPlacement.requestPin()) setIsShowManualPinHint(true);
  };
  const isShowWidgetOffer = () =>
    isWidgetPinAvailable() && !widgetPlacement.getIsPlaced();

  // Mark onboarding done once the required permissions are granted (step 3
  // onward): from there minded is functional, so a force-quit shouldn't drop the
  // user back into the welcome. The denied path jumps straight to step 4.
  createEffect(() => {
    if (getStep() >= 3) {
      updateUserCfg({ isOnboardingComplete: true });
    }
  });

  return (
    <div class={`${styles.wrapper}`}>
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
                    This little {companionWord()} is your anchor. When you open
                    an app on autopilot, it appears — a calm moment to pause,
                    right there over the app.
                  </p>
                  <p>Tap it to feel what that's like.</p>
                </div>

                <ButtonWrapper isVisible={true}>
                  <Btn big onClick={() => changeStep(1)}>
                    begin
                  </Btn>
                </ButtonWrapper>

                <div class={styles.skipWrapper}>
                  <Btn outline onClick={handleSkipForNow}>
                    I'll set this up later
                  </Btn>
                </div>
              </div>
            </Match>

            <Match when={getShownStep() === 1}>
              <div
                class={`${styles.step} ${styles.stepUnderSky} pageTransitionIn`}
              >
                <SettingsAndroid
                  isRouting={false}
                  heading={`Where should the ${companionWord()} meet you?`}
                  saveBtnTxt="save & continue"
                  onSave={handlePlacesSaved}
                />
              </div>
            </Match>
            <Match when={getShownStep() === 2}>
              <div
                class={`${styles.step} ${styles.stepUnderSky} pageTransitionIn`}
              >
                <MissingCapabilityView
                  requiredOnly={true}
                  onAllConfigured={() => {
                    changeStep(3);
                    setPermissionNotGiven(false);
                  }}
                  onPermissionDenied={() => {
                    changeStep(4);
                    setPermissionNotGiven(true);
                  }}
                />
              </div>
            </Match>
            <Match when={getShownStep() === 3}>
              <div
                class={`${styles.step} ${styles.stepUnderSky} pageTransitionIn`}
              >
                <MissingCapabilityView
                  optionalOnly={true}
                  onAllConfigured={() => changeStep(4)}
                />
              </div>
            </Match>
            <Match when={getShownStep() >= 4}>
              {getPermissionNotGiven() ? (
                <div
                  class={`${styles.step} ${styles.stepUnderSky} pageTransitionIn`}
                >
                  <div class="card">
                    <div class="h2 h2Mindful">Almost there</div>
                    <p>
                      Some permissions are still missing, so the{" "}
                      {companionWord()} can't meet you everywhere yet. You can
                      finish anytime. It'll be here.
                    </p>
                    {/* The costless alternative, offered exactly where the
                        permission path dead-ends: the home-screen widget needs
                        none of what was just declined. Gated on the observed
                        launcher state, so it's never suggested twice. */}
                    <Show when={isShowWidgetOffer()}>
                      <p>
                        Or let the {companionWord()} wait on your home screen
                        instead — that needs no permissions at all.
                      </p>
                    </Show>
                    <Show when={getIsShowManualPinHint()}>
                      <p class={styles.manualPinHint}>
                        Your launcher doesn't support adding it from here:
                        long-press your home screen → Widgets → <em>minded</em>.
                      </p>
                    </Show>
                    <div class={styles.actions}>
                      <Show when={isShowWidgetOffer()}>
                        <Btn onClick={handleOfferPin}>
                          add it to your home screen
                        </Btn>
                      </Show>
                      <Btn
                        onClick={() => {
                          changeStep(2);
                          setPermissionNotGiven(false);
                        }}
                      >
                        finish setting up
                      </Btn>
                      <Btn onClick={leaveToDashboard} class={styles.laterBtn}>
                        later
                      </Btn>
                    </div>
                  </div>
                </div>
              ) : (
                <div class={`${styles.step} pageTransitionIn`}>
                  <div class="card">
                    <div
                      class={styles.sunSpacer}
                      ref={(el) => (spacerEl = el)}
                    />
                    <div class="h2 h2Mindful">
                      The {companionWord()} is ready
                    </div>
                    {getHasApps() ? (
                      <>
                        <p>
                          From now on, when you open one of those apps, the{" "}
                          {companionWord()} appears: a moment to pause and
                          notice before you carry on.
                        </p>
                        <p>
                          You can always fling it away. It's an invitation,
                          never a wall.
                        </p>
                      </>
                    ) : (
                      <p>
                        It now waits on your home screen — a quiet companion at
                        the glance where scrolling begins. Whenever you tap it
                        there, this pause is one touch away.
                      </p>
                    )}
                    <div class={styles.actions}>
                      <Btn big onClick={leaveToDashboard}>
                        continue
                      </Btn>
                    </div>
                  </div>
                </div>
              )}
            </Match>
          </Switch>
        </div>

        <Stepper
          nrOfSteps={displayNrOfSteps()}
          activeStep={displayActiveStep()}
          // On re-entry from the dashboard invitation (initialStep > 0) the
          // welcome — with its "set this up later" skip — is behind us; don't let
          // the stepper walk back into it.
          isNoGoBack={(props.initialStep ?? 0) > 0}
          // In the short (widget-only) flow the reachable dots map 1:1 onto the
          // logical steps (0 welcome, 1 places) — only the collapsed permission
          // dots are gone — so the logical step IS the display step here.
          onSetStep={(step) => changeStep(step)}
        />
      </div>

      {/* The ONE onboarding sun + its tap-to-pause demo (shared with iOS). The
          flow supplies its own rests (getSunSettle, sky-band aware) and how to
          advance off the welcome. */}
      <OnboardingSunLayer
        getStep={getStep}
        getIsLeaving={getIsLeaving}
        getBaseSettle={getSunSettle}
        advanceFromWelcome={() => changeStep(1)}
      />

      <div class={styles.skyProbe} ref={skyProbeEl} />
      <div class={styles.companionProbe} ref={companionProbeEl} />
    </div>
  );
};

export default OnboardingAndroid;
