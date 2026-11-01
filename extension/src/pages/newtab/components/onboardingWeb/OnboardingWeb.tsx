import {
  createEffect,
  createMemo,
  createSignal,
  JSX,
  Match,
  on,
  onCleanup,
  onMount,
  Switch,
} from "solid-js";
import { WebsiteList } from "@pages/newtab/components/onboardingWeb/WebsiteList";
// @ts-ignore
import { updateUserCfg } from "@src/dataInterface/commonSyncDataInterface";
import { companionWord } from "@src/shared/addWrapperClasses";
import { OnboardingSunLayer } from "@src/shared/components/onboarding/OnboardingSunLayer";
import {
  COMPANION_GLIDE_MS,
  type SunSettle,
} from "@src/shared/components/interaction/sun/Sun";
import { readCompanionBottomPx } from "@src/shared/components/interaction/sun/companionAnchor";
import {
  requestSunFocus,
  setCompanionBottomYPx,
} from "@src/shared/components/interaction/sun/sunStore";
import { TimeSelection } from "@src/shared/components/interaction/timeSelection/TimeSelection";
import Btn from "@src/shared/components/ui/Btn";
import ButtonWrapper from "@src/shared/components/ui/ButtonWrapper";
import { Stepper } from "@src/shared/components/ui/Stepper";
import {
  fadeOut,
  fadeOutThen,
  PAGE_FADE_MS,
  promiseTimeout,
} from "@src/util/animation";
import { prefersReducedMotion } from "@src/util/prefersReducedMotion";
import { InterventionHints } from "./InterventionHints";
import {
  getWebOnboardingSunSettle,
  WEB_ONBOARDING_SITES_STEP,
} from "./onboardingWebSunSettle";
// @ts-ignore
import styles from "./OnboardingWeb.module.scss";

const ANCHOR_TOLERANCE_PX = 6;
const READY_STEP = 2;

/**
 * The welcome's beats: its hints, then (after continuing with the disc) the
 * practice time choice and what that choice leads to.
 */
type WelcomeView = "hints" | "choosing" | "chosen";

export const OnboardingWeb: (props: {
  onComplete: () => void;
}) => JSX.Element = (props) => {
  // The logical step moves the sun and stepper immediately; the shown content
  // follows after its predecessor has faded away.
  const [getStep, setStep] = createSignal(0);
  const [getShownStep, setShownStep] = createSignal(0);
  const [getIsLeaving, setIsLeaving] = createSignal(false);
  // Where a saved completion leads: the dashboard here, or a real chosen site.
  const [getPendingExit, setPendingExit] = createSignal<
    "dashboard" | "site" | null
  >(null);
  const getIsSavingCompletion = () => getPendingExit() != null;
  const [getCompletionError, setCompletionError] = createSignal("");
  // The welcome's beat, logical (moves the sun at once) and shown (follows the
  // content fade), like the step pair above.
  const [getWelcomeView, setWelcomeView] = createSignal<WelcomeView>("hints");
  const [getShownWelcomeView, setShownWelcomeView] =
    createSignal<WelcomeView>("hints");
  const isPracticing = () => getStep() === 0 && getWelcomeView() !== "hints";
  const isShownUnderSky = () =>
    getShownStep() === WEB_ONBOARDING_SITES_STEP ||
    (getShownStep() === 0 && getShownWelcomeView() !== "hints");
  const [getTrySite, setTrySite] = createSignal<string | null>(null);

  let contentEl: HTMLDivElement | undefined;
  let chromeEl: HTMLDivElement | undefined;
  let skyProbeEl: HTMLDivElement | undefined;
  let companionProbeEl: HTMLDivElement | undefined;
  let spacerEl: HTMLDivElement | undefined;
  let isStepSwapInFlight = false;
  let isDisposed = false;

  onCleanup(() => {
    isDisposed = true;
  });

  const [getHeroY, setHeroY] = createSignal<number | null>(null);
  const [getSkyY, setSkyY] = createSignal<number | null>(null);
  const [getCompanionY, setCompanionY] = createSignal<number | null>(null);

  const measureAnchors = () => {
    if (companionProbeEl) {
      const companionBottom = readCompanionBottomPx(companionProbeEl);
      if (companionBottom != null) {
        setCompanionY(companionBottom);
        // Seed the exact rest the dashboard shell will mount onto, including
        // while the welcome's real pause demo temporarily uses the store.
        setCompanionBottomYPx(companionBottom);
      }
    }

    if (skyProbeEl) {
      const viewportHeight =
        document.documentElement.clientHeight || window.innerHeight;
      setSkyY(viewportHeight - skyProbeEl.getBoundingClientRect().top);
    }

    if (spacerEl?.isConnected) {
      const rect = spacerEl.getBoundingClientRect();
      const viewportHeight =
        document.documentElement.clientHeight || window.innerHeight;
      setHeroY(viewportHeight - (rect.top + rect.height / 2));
    } else {
      setHeroY(null);
    }
  };

  createEffect(
    on([getShownStep, getShownWelcomeView], () => {
      measureAnchors();
      const frame = requestAnimationFrame(measureAnchors);
      const arrivingStep = contentEl?.firstElementChild;
      // Measure at the real end of the shared page entrance instead of copying
      // its duration into JS (the routine timing is intentionally tuneable).
      const onEntranceEnd = (event: Event) => {
        if (event.target !== arrivingStep) return;
        measureAnchors();
        arrivingStep?.removeEventListener("animationend", onEntranceEnd);
      };
      arrivingStep?.addEventListener("animationend", onEntranceEnd);
      onCleanup(() => {
        cancelAnimationFrame(frame);
        arrivingStep?.removeEventListener("animationend", onEntranceEnd);
      });
    }),
  );

  onMount(() => {
    window.addEventListener("resize", measureAnchors);
    onCleanup(() => window.removeEventListener("resize", measureAnchors));
  });

  const getSunSettle = createMemo<SunSettle | null>((previous) => {
    const next = getWebOnboardingSunSettle(
      {
        step: getStep(),
        isLeaving: getIsLeaving(),
        isPracticing: isPracticing(),
      },
      {
        heroYFromBottom: getHeroY(),
        skyYFromBottom: getSkyY(),
        companionYFromBottom: getCompanionY(),
      },
    );

    // Once mounted, keep the last real rest through the brief gap where the
    // destination's spacer/probe has not rendered yet. The disc never detours
    // through its unanchored centre between steps.
    if (next == null && previous != null) return previous;

    if (
      previous != null &&
      next != null &&
      previous.scale === next.scale &&
      Math.abs(
        (previous.anchorYPxFromBottom ?? 0) - (next.anchorYPxFromBottom ?? 0),
      ) < ANCHOR_TOLERANCE_PX
    ) {
      return previous;
    }
    return next;
  });

  // Fade the shown content out, then catch it up with the logical state.
  const swapShownContent = () => {
    if (isStepSwapInFlight) return;
    isStepSwapInFlight = true;
    fadeOutThen(contentEl ?? null, () => {
      isStepSwapInFlight = false;
      if (isDisposed) return;
      setShownStep(getStep());
      setShownWelcomeView(getWelcomeView());
      if (contentEl) {
        contentEl.style.opacity = "";
        contentEl.style.transition = "";
      }
    });
  };

  const changeStep = (next: number) => {
    if (next === getStep() || getIsLeaving() || getIsSavingCompletion()) return;
    setStep(next);
    setWelcomeView("hints");
    swapShownContent();
  };

  // The continue practice: the real time choices, but nothing they pick is
  // saved or started.
  const changeWelcomeView = (next: WelcomeView) => {
    if (getStep() !== 0 || getIsLeaving() || next === getWelcomeView()) return;
    setWelcomeView(next);
    swapShownContent();
  };

  // Keyboard users continued from the disc, which then leaves the tab order -
  // carry focus on to the first choice. The choices stay hidden (unfocusable)
  // until they follow the spoken question in, so wait for that reveal, and
  // never take focus from something the user has moved to meanwhile.
  const focusFirstTimeChoiceOnReveal = (stepEl: HTMLElement) => {
    const onRevealEnd = (event: AnimationEvent) => {
      const target = event.target as HTMLElement;
      if (!target.classList.contains("time-options-grid")) return;
      stepEl.removeEventListener("animationend", onRevealEnd);
      const active = document.activeElement;
      if (active && active !== document.body) return;
      target.querySelector<HTMLButtonElement>(".time-option")?.focus();
    };
    stepEl.addEventListener("animationend", onRevealEnd);
  };

  // After a pick the chosen time button is gone; carry keyboard focus on to
  // the next control (never taking it from one the user moved to).
  const focusButtonWhenUnclaimed = (stepEl: HTMLElement) => {
    requestAnimationFrame(() => {
      const active = document.activeElement;
      if (active && active !== document.body) return;
      stepEl.querySelector<HTMLButtonElement>("button")?.focus();
    });
  };

  const cancelTimePractice = () => {
    changeWelcomeView("hints");
    // Keyboard users land back on the disc they continued from. The cancel
    // button is fading out with its beat, so release it first - the sun only
    // takes a focus request that wouldn't steal from a live control.
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    requestSunFocus();
  };

  // Persist the marker before either exit. On failure, stay with an error.
  const saveCompletion = async (
    exit: "dashboard" | "site",
  ): Promise<boolean> => {
    if (getIsLeaving() || getIsSavingCompletion()) return false;
    setPendingExit(exit);
    setCompletionError("");

    try {
      await updateUserCfg({ isOnboardingComplete: true });
      return true;
    } catch {
      if (!isDisposed) {
        setPendingExit(null);
        setCompletionError("Could not save. Please try again.");
      }
      return false;
    }
  };

  // The real test: this tab goes to the chosen site, where the content script
  // meets it with a genuine intervention. Onboarding is already marked done,
  // so the next new tab opens on the dashboard.
  const tryOnSite = async () => {
    const site = getTrySite();
    if (!site || !(await saveCompletion("site")) || isDisposed) return;
    if (!prefersReducedMotion() && chromeEl) {
      fadeOut(chromeEl, PAGE_FADE_MS);
      await promiseTimeout(PAGE_FADE_MS);
    }
    window.location.assign(`https://${site}`);
  };

  // The final beat owns the only exit. Its disc glides onto the dashboard's
  // companion anchor while the onboarding chrome fades, then the shell takes
  // over at the exact same point.
  const leaveToDashboard = async () => {
    if (!(await saveCompletion("dashboard")) || isDisposed) return;
    setPendingExit(null);
    setIsLeaving(true);
    measureAnchors();

    const companionY = getCompanionY();
    if (companionY != null) setCompanionBottomYPx(companionY);

    if (prefersReducedMotion()) {
      if (!isDisposed) props.onComplete();
      return;
    }

    if (chromeEl) fadeOut(chromeEl, PAGE_FADE_MS);
    await promiseTimeout(COMPANION_GLIDE_MS + 100);
    if (!isDisposed) props.onComplete();
  };

  return (
    <div class={styles.welcomeWrapper}>
      <div
        class={styles.chrome}
        classList={{ [styles.isLeaving]: getIsLeaving() }}
        ref={chromeEl}
        aria-hidden={getIsLeaving() ? "true" : undefined}
        inert={getIsLeaving() ? true : undefined}
      >
        <div
          class={styles.contentWrapper}
          classList={{
            [styles.withSkyRest]: isShownUnderSky(),
          }}
          ref={contentEl}
        >
          <Switch>
            <Match
              when={getShownStep() === 0 && getShownWelcomeView() === "hints"}
            >
              <div class={`${styles.step} pageTransitionIn`}>
                <div class={styles.sunSpacer} ref={(el) => (spacerEl = el)} />
                <div class="h2 h2Mindful">
                  Meet <em>minded</em>
                </div>
                <div class={styles.infoText}>
                  {/* The intervention's own gestures and words: on desktop the
                      sun only ever meets you there, so both of its outcomes
                      are what to rehearse (the tap-to-pause companion doesn't
                      exist here). */}
                  <InterventionHints objectName={companionWord()} />
                </div>
                {/* Keyboard users can only continue with the disc (Enter, as
                    on a real site) - this is their way past the let-go. */}
                <ButtonWrapper isVisible={true}>
                  <Btn
                    plain
                    onClick={() => changeStep(WEB_ONBOARDING_SITES_STEP)}
                  >
                    next
                  </Btn>
                </ButtonWrapper>
              </div>
            </Match>

            <Match
              when={
                getShownStep() === 0 && getShownWelcomeView() === "choosing"
              }
            >
              <div
                class={`${styles.step} ${styles.stepUnderSky} pageTransitionIn`}
                ref={focusFirstTimeChoiceOnReveal}
              >
                <TimeSelection
                  isArmed={true}
                  onSelectTime={() => changeWelcomeView("chosen")}
                  onCancel={cancelTimePractice}
                />
              </div>
            </Match>

            <Match
              when={getShownStep() === 0 && getShownWelcomeView() === "chosen"}
            >
              <div
                class={`${styles.step} ${styles.stepUnderSky} pageTransitionIn`}
                ref={focusButtonWhenUnclaimed}
              >
                <div class="h2 h2Mindful">
                  The {companionWord()} waits in the corner
                </div>
                <div class={styles.infoText}>
                  <p>When your time is up, it returns.</p>
                </div>
                <ButtonWrapper isVisible={true}>
                  <Btn onClick={() => changeStep(WEB_ONBOARDING_SITES_STEP)}>
                    next
                  </Btn>
                </ButtonWrapper>
              </div>
            </Match>

            <Match when={getShownStep() === WEB_ONBOARDING_SITES_STEP}>
              <div
                class={`${styles.step} ${styles.stepUnderSky} pageTransitionIn`}
              >
                <div class="h2 h2Mindful">
                  Where should the {companionWord()} meet you?
                </div>
                <div class={styles.infoText}>
                  <p>
                    Add the sites where you tend to get pulled in. The{" "}
                    {companionWord()} shows up only there, nowhere else.
                  </p>
                </div>
                <WebsiteList
                  onAfterSave={(savedHosts) => {
                    setTrySite(savedHosts[0] ?? null);
                    changeStep(READY_STEP);
                  }}
                />
              </div>
            </Match>

            <Match when={getShownStep() === READY_STEP}>
              <div class={`${styles.step} pageTransitionIn`}>
                <div class={styles.sunSpacer} ref={(el) => (spacerEl = el)} />
                <div class="h2 h2Mindful">The {companionWord()} is ready</div>
                <div class={styles.infoText}>
                  <p>
                    It will meet you on those sites as a quiet invitation to
                    pause, never a wall.
                  </p>
                </div>
                <ButtonWrapper isVisible={true}>
                  <div class={styles.readyActions}>
                    <Btn
                      big
                      disabled={getIsSavingCompletion()}
                      onClick={leaveToDashboard}
                    >
                      {getPendingExit() === "dashboard"
                        ? "saving…"
                        : "continue"}
                    </Btn>
                    {getTrySite() && (
                      <Btn
                        soft
                        disabled={getIsSavingCompletion()}
                        onClick={tryOnSite}
                      >
                        {getPendingExit() === "site"
                          ? "saving…"
                          : `try it on ${getTrySite()}`}
                      </Btn>
                    )}
                  </div>
                </ButtonWrapper>
                {getCompletionError() && (
                  <div class={styles.completionError} role="alert">
                    {getCompletionError()}
                  </div>
                )}
              </div>
            </Match>
          </Switch>
        </div>

        <Stepper
          nrOfSteps={READY_STEP + 1}
          activeStep={getStep()}
          isNoGoBack={getIsSavingCompletion()}
          onSetStep={(step) => changeStep(step)}
        />
      </div>

      <OnboardingSunLayer
        getStep={getStep}
        getIsLeaving={getIsLeaving}
        getBaseSettle={getSunSettle}
        advanceFromWelcome={() => changeStep(WEB_ONBOARDING_SITES_STEP)}
        welcomeGesture="intervention"
        onWelcomeContinue={() => changeWelcomeView("choosing")}
        getIsWelcomeHeld={isPracticing}
      />

      <div class={styles.skyProbe} ref={skyProbeEl} aria-hidden="true" />
      <div
        class={styles.companionProbe}
        ref={companionProbeEl}
        aria-hidden="true"
      />
    </div>
  );
};
