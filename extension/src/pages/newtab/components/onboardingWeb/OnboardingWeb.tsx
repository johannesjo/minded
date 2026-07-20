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
import { setCompanionBottomYPx } from "@src/shared/components/interaction/sun/sunStore";
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
import { getWebOnboardingSunSettle } from "./onboardingWebSunSettle";
// @ts-ignore
import styles from "./OnboardingWeb.module.scss";

const ANCHOR_TOLERANCE_PX = 6;

export const OnboardingWeb: (props: {
  onComplete: () => void;
}) => JSX.Element = (props) => {
  // The logical step moves the sun and stepper immediately; the shown content
  // follows after its predecessor has faded away.
  const [getStep, setStep] = createSignal(0);
  const [getShownStep, setShownStep] = createSignal(0);
  const [getIsLeaving, setIsLeaving] = createSignal(false);
  const [getIsSavingCompletion, setIsSavingCompletion] = createSignal(false);
  const [getCompletionError, setCompletionError] = createSignal("");

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
    on(getShownStep, () => {
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
    const next = getWebOnboardingSunSettle(getStep(), getIsLeaving(), {
      heroYFromBottom: getHeroY(),
      skyYFromBottom: getSkyY(),
      companionYFromBottom: getCompanionY(),
    });

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

  const changeStep = (next: number) => {
    if (next === getStep() || getIsLeaving() || getIsSavingCompletion()) return;
    setStep(next);
    if (isStepSwapInFlight) return;
    isStepSwapInFlight = true;
    fadeOutThen(contentEl ?? null, () => {
      isStepSwapInFlight = false;
      if (isDisposed) return;
      setShownStep(getStep());
      if (contentEl) {
        contentEl.style.opacity = "";
        contentEl.style.transition = "";
      }
    });
  };

  // The final beat owns the only exit. Its disc glides onto the dashboard's
  // companion anchor while the onboarding chrome fades, then the shell takes
  // over at the exact same point.
  const leaveToDashboard = async () => {
    if (getIsLeaving() || getIsSavingCompletion()) return;
    setIsSavingCompletion(true);
    setCompletionError("");

    try {
      await updateUserCfg({ isOnboardingComplete: true });
    } catch {
      if (!isDisposed) {
        setIsSavingCompletion(false);
        setCompletionError("Could not save. Please try again.");
      }
      return;
    }

    if (isDisposed) return;
    setIsSavingCompletion(false);
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
          classList={{ [styles.withSkyRest]: getShownStep() === 1 }}
          ref={contentEl}
        >
          <Switch>
            <Match when={getShownStep() === 0}>
              <div class={`${styles.step} pageTransitionIn`}>
                <div class={styles.sunSpacer} ref={(el) => (spacerEl = el)} />
                <div class="h2 h2Mindful">
                  Meet <em>minded</em>
                </div>
                <div class={styles.infoText}>
                  <p>
                    This little {companionWord()} is your anchor. When you reach
                    for a habit on autopilot, it appears as a calm moment to
                    pause.
                  </p>
                  <p>Tap it to feel what that's like.</p>
                </div>
                <ButtonWrapper isVisible={true}>
                  <Btn big onClick={() => changeStep(1)}>
                    begin
                  </Btn>
                </ButtonWrapper>
              </div>
            </Match>

            <Match when={getShownStep() === 1}>
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
                <WebsiteList onAfterSave={() => changeStep(2)} />
              </div>
            </Match>

            <Match when={getShownStep() === 2}>
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
                  <Btn
                    big
                    disabled={getIsSavingCompletion()}
                    onClick={leaveToDashboard}
                  >
                    {getIsSavingCompletion() ? "saving…" : "continue"}
                  </Btn>
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
          nrOfSteps={3}
          activeStep={getStep()}
          isNoGoBack={getIsSavingCompletion()}
          onSetStep={(step) => changeStep(step)}
        />
      </div>

      <OnboardingSunLayer
        getStep={getStep}
        getIsLeaving={getIsLeaving}
        getBaseSettle={getSunSettle}
        advanceFromWelcome={() => changeStep(1)}
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
