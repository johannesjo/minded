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
import { companionWord, isDarkModeNow } from "@src/shared/addWrapperClasses";
import Btn from "@src/shared/components/ui/Btn";
import { Stepper } from "@src/shared/components/ui/Stepper";
import Sun, {
  COMPANION_GLIDE_MS,
  SunSettle,
} from "@src/shared/components/interaction/sun/Sun";
import { setCompanionBottomYPx } from "@src/shared/components/interaction/sun/sunStore";
import { getOnboardingSunSettle } from "./onboardingSunSettle";
import {
  fadeOut,
  PAGE_FADE_MS,
  prefersReducedMotion,
  promiseTimeout,
} from "@src/util/animation";
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
   * dashboard's "finish setup" invitation re-enters at 1 (the app picker),
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

  const isReEntry = (props.initialStep ?? 0) > 0;
  // Re-entry starts the disc on the companion anchor the dashboard sun just
  // rested on, then lifts it to the sky next frame — the same sun visibly
  // rises out of the bar instead of a second one popping in elsewhere.
  const [getHasLifted, setHasLifted] = createSignal(!isReEntry);

  // Day/night read once at mount, matching the companionWord() the copy uses.
  // (Same shortcut as RouteCmp: a resume across the dark-mode threshold while
  // this is open won't flip the disc — rare; add a resume listener if it bites.)
  const sunVariant = isDarkModeNow() ? "moon" : "sun";

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
    const companionBottom = parseFloat(
      getComputedStyle(companionProbeEl).bottom,
    );
    if (Number.isFinite(companionBottom)) setCompanionY(companionBottom);
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

  // Only the welcome step's disc takes input — everywhere else the sun is a
  // quiet presence (and the closing "ready" disc can never be dismissed).
  const isSunGrabbable = () => getStep() === 0 && !getIsLeaving();

  // The welcome gesture: advance the moment a fling/drag completes. The step
  // change swaps the settle target synchronously inside the gesture handler,
  // so Sun's settle-takeover guards catch the disc before it flies off-screen
  // and it soars to its sky rest instead. onFlingAway/onDragComplete stay as
  // fallbacks for paths where no takeover happened (reduced motion).
  const advanceFromHero = () => {
    if (getStep() === 0 && !getIsLeaving()) changeStep(1);
  };

  const changeStep = (next: number) => {
    if (next === getStep() || getIsLeaving()) return;
    setStep(next); // Stepper + sun move now; the content follows the fade
    if (isStepSwapInFlight) return; // the in-flight swap picks up the new step
    if (prefersReducedMotion()) {
      setShownStep(next);
      return;
    }
    isStepSwapInFlight = true;
    fadeOut(contentEl, PAGE_FADE_MS).promise.then(() => {
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
                    an app on autopilot, it appears as a calm moment to pause.
                  </p>
                  <p>
                    To set it up, <em>minded</em> needs a few permissions and
                    the apps where it should appear.
                  </p>
                </div>

                <ButtonWrapper isVisible={true}>
                  <Btn big onClick={() => changeStep(1)}>
                    begin
                  </Btn>
                </ButtonWrapper>

                <div style={{ "margin-top": "16px" }}>
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
                  heading={`Where should the ${companionWord()} meet you? Pick at least one app.`}
                  saveBtnTxt="save & continue"
                  onSave={() => changeStep(2)}
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
                    <div style={{ "margin-top": "32px" }}>
                      <Btn
                        onClick={() => {
                          changeStep(2);
                          setPermissionNotGiven(false);
                        }}
                      >
                        finish setting up
                      </Btn>
                      <Btn
                        onClick={leaveToDashboard}
                        style={{ "margin-left": "16px" }}
                      >
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
                    <p>
                      From now on, when you open one of those apps, the{" "}
                      {companionWord()} appears: a moment to pause and notice
                      before you carry on.
                    </p>
                    <p>
                      You can always fling it away. It's an invitation, never a
                      wall.
                    </p>
                    <div style={{ "margin-top": "32px" }}>
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
          nrOfSteps={5}
          activeStep={getStep()}
          // On re-entry from the dashboard invitation (initialStep > 0) the
          // welcome — with its "set this up later" skip — is behind us; don't let
          // the stepper walk back into it.
          isNoGoBack={(props.initialStep ?? 0) > 0}
          onSetStep={(step) => changeStep(step)}
        />
      </div>

      {/*
        The ONE onboarding sun. Mirrors the shell's fixed sun layer: the flow
        never mounts a per-step disc — this single element morphs from the
        welcome hero to its sky rest through the chores, back down for "ready",
        and finally glides onto the companion anchor the dashboard sun takes
        over. It mounts only once its first rest is measured, snapping straight
        into place (never a centre-flash), softened by the layer's fade-in.
      */}
      <div
        class={styles.sunLayer}
        classList={{
          [styles.isInteractive]: isSunGrabbable(),
          [styles.isLeaving]: getIsLeaving(),
        }}
      >
        <Show when={getSunSettle()}>
          <Sun
            variant={sunVariant}
            settle={getSunSettle()}
            minimizeWillChange={true}
            isTapEnabled={false}
            isDragEnabled={isSunGrabbable()}
            onSkip={advanceFromHero}
            onFlingAway={advanceFromHero}
            onDragComplete={advanceFromHero}
            onCompletionStarted={(started) => started && advanceFromHero()}
          />
        </Show>
      </div>

      <div class={styles.skyProbe} ref={skyProbeEl} />
      <div class={styles.companionProbe} ref={companionProbeEl} />
    </div>
  );
};

export default OnboardingAndroid;
