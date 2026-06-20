import { createEffect, createSignal, Match, Switch } from "solid-js";
import { MissingCapabilityView } from "@src/android/components/missingCapabilities/MissingCapabilities";
import { SettingsAndroid } from "@src/android/components/settingsAndroid/SettingsAndroid";
import ButtonWrapper from "@src/shared/components/ui/ButtonWrapper";
// @ts-ignore
import styles from "./OnboardingAndroid.module.scss";
import { updateUserCfg } from "@src/dataInterface/commonSyncDataInterface";
import { Stepper } from "@src/shared/components/ui/Stepper";
import Btn from "@src/shared/components/ui/Btn";

export const OnboardingAndroid = (props: {
  onGoDashboard: () => void;
  /**
   * Where to enter the flow. First run starts at 0 (the sun intro); the
   * dashboard's "finish setup" invitation re-enters at 1 (the app picker),
   * skipping the welcome the user has already seen.
   */
  initialStep?: number;
}) => {
  const [getStep, setStep] = createSignal<number>(props.initialStep ?? 0);
  const [getPermissionNotGiven, setPermissionNotGiven] =
    createSignal<boolean>(false);

  // Deferral: meeting the sun must never be gated behind the setup chore.
  // Skipping marks onboarding seen (so it won't reappear) and drops the user
  // on the dashboard; the incomplete state is recoverable from there.
  const handleSkipForNow = async () => {
    await updateUserCfg({ isOnboardingComplete: true });
    props.onGoDashboard();
  };

  createEffect(() => {
    if (getStep() === 3) {
      updateUserCfg({ isOnboardingComplete: true });
    }
  });

  return (
    <div class={`${styles.wrapper}`}>
      <div class={styles.contentWrapper}>
        <Switch>
          <Match when={getStep() === 0}>
            <div class="pageWrapper pageTransitionIn">
              <div class="h2 h2Mindful">
                Meet <em>minded</em> 🌞
              </div>
              <div class="txtSlightlyBigger">
                <p>
                  This little sun is your anchor. When you open an app on
                  autopilot, it appears — something calm to come back to. Pause
                  with it, and the pull loosens. You can fling it away anytime;
                  it never blocks you. No streaks, no scores — just awareness.
                </p>
                <p>
                  Why a sun and not a blocker? Blockers and willpower work right
                  up until you route around them. Mindfulness — simply noticing,
                  without judgment — is one of the few things that actually holds
                  up over months and years, because it builds a capacity in you
                  instead of a wall around you.
                </p>
                <p>
                  To meet you in those moments, <em>minded</em> needs a couple of
                  permissions and the apps where you'd like it to show up. Let's
                  set that up together.
                </p>
              </div>

              <ButtonWrapper isVisible={true}>
                <Btn big onClick={() => setStep(1)}>
                  begin
                </Btn>
              </ButtonWrapper>

              <div style="margin-top: 16px;">
                <Btn outline onClick={handleSkipForNow}>
                  I'll set this up later
                </Btn>
              </div>
            </div>
          </Match>

          <Match when={getStep() === 1}>
            <div class="pageTransitionIn">
              <SettingsAndroid
                isRouting={false}
                heading="Where would you like the sun to meet you? Pick at least one app where it should appear."
                saveBtnTxt="save & continue"
                onSave={() => setStep(2)}
              />
            </div>
          </Match>
          <Match when={getStep() === 2}>
            <div class="pageWrapper pageTransitionIn">
              <MissingCapabilityView
                requiredOnly={true}
                onAllConfigured={() => {
                  setStep(3);
                  setPermissionNotGiven(false);
                }}
                onPermissionDenied={() => {
                  setStep(3);
                  setPermissionNotGiven(true);
                }}
              />
            </div>
          </Match>
          <Match when={getStep() >= 3}>
            {getPermissionNotGiven() ? (
              <div class="card pageTransitionIn" style="margin: 32px;">
                <div class="h2 h2Mindful">
                  <em>minded</em> is not completely configured 🙁
                </div>
                <p>
                  You did not configure all the permissions needed. You might
                  still be able to use <em>minded</em>, but it will{" "}
                  <strong>not work as intended</strong>.
                </p>
                <div style="margin-top: 32px;">
                  <Btn
                    onClick={() => {
                      setStep(2);
                      setPermissionNotGiven(false);
                    }}
                  >
                    back
                  </Btn>
                  <Btn
                    onClick={() => props.onGoDashboard()}
                    style="margin-left: 16px;"
                  >
                    continue anyway
                  </Btn>
                </div>
              </div>
            ) : (
              <div class="card pageTransitionIn" style="margin: 32px;">
                <div class="h2 h2Mindful">
                  The sun is ready 🌞
                </div>
                <p>
                  From now on, when you open one of those apps, the sun will
                  appear — a small moment to pause and notice before you carry
                  on.
                </p>
                <p>
                  You can always fling it away in a single gesture. It's an
                  invitation, never a wall.
                </p>
                <div style="margin-top: 32px;">
                  <Btn big onClick={() => props.onGoDashboard()}>
                    continue
                  </Btn>
                </div>
              </div>
            )}
          </Match>
        </Switch>
      </div>

      <Stepper
        nrOfSteps={4}
        activeStep={getStep()}
        // On re-entry from the dashboard invitation (initialStep > 0) the
        // welcome — with its "set this up later" skip — is behind us; don't let
        // the stepper walk back into it.
        isNoGoBack={(props.initialStep ?? 0) > 0}
        onSetStep={(step) => setStep(step)}
        labelFn={(step) =>
          step === 3 ? (getPermissionNotGiven() ? "🙁" : "🌞") : undefined
        }
      />
    </div>
  );
};

export default OnboardingAndroid;
