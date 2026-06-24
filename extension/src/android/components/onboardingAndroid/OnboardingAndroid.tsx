import { MissingCapabilityView } from "@src/android/components/missingCapabilities/MissingCapabilities";
import { SettingsAndroid } from "@src/android/components/settingsAndroid/SettingsAndroid";
import ButtonWrapper from "@src/shared/components/ui/ButtonWrapper";
import { createEffect, createSignal, Match, Switch } from "solid-js";
// @ts-ignore
import { updateUserCfg } from "@src/dataInterface/commonSyncDataInterface";
import OnboardingSun from "@src/shared/components/interaction/sun/OnboardingSun";
import Btn from "@src/shared/components/ui/Btn";
import { Stepper } from "@src/shared/components/ui/Stepper";
import styles from "./OnboardingAndroid.module.scss";

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
      <div class={styles.contentWrapper}>
        <Switch>
          <Match when={getStep() === 0}>
            <div class="pageWrapper pageTransitionIn">
              <OnboardingSun onDismiss={() => setStep(1)} />
              <div class="h2 h2Mindful">
                Meet <em>minded</em>
              </div>
              <div class="txtSlightlyBigger">
                <p>
                  This little sun is your anchor. When you open an app on
                  autopilot, it appears as a calm moment to pause.
                </p>
                <p>
                  To set it up, <em>minded</em> needs a few permissions and the
                  apps where it should appear.
                </p>
              </div>

              <ButtonWrapper isVisible={true}>
                <Btn big onClick={() => setStep(1)}>
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

          <Match when={getStep() === 1}>
            <div class="pageTransitionIn">
              <SettingsAndroid
                isRouting={false}
                heading="Where should the sun meet you? Pick at least one app."
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
                  setStep(4);
                  setPermissionNotGiven(true);
                }}
              />
            </div>
          </Match>
          <Match when={getStep() === 3}>
            <div class="pageWrapper pageTransitionIn">
              <MissingCapabilityView
                optionalOnly={true}
                onAllConfigured={() => setStep(4)}
              />
            </div>
          </Match>
          <Match when={getStep() >= 4}>
            {getPermissionNotGiven() ? (
              <div class="card pageTransitionIn" style={{ margin: "32px" }}>
                <div class="h2 h2Mindful">Almost there</div>
                <p>
                  Some permissions are still missing, so the sun can't meet you
                  everywhere yet. You can finish anytime. It'll be here.
                </p>
                <div style={{ "margin-top": "32px" }}>
                  <Btn
                    onClick={() => {
                      setStep(2);
                      setPermissionNotGiven(false);
                    }}
                  >
                    finish setting up
                  </Btn>
                  <Btn
                    onClick={() => props.onGoDashboard()}
                    style={{ "margin-left": "16px" }}
                  >
                    later
                  </Btn>
                </div>
              </div>
            ) : (
              <div class="card pageTransitionIn" style={{ margin: "32px" }}>
                <OnboardingSun />
                <div class="h2 h2Mindful">The sun is ready</div>
                <p>
                  From now on, when you open one of those apps, the sun appears:
                  a moment to pause and notice before you carry on.
                </p>
                <p>
                  You can always fling it away. It's an invitation, never a
                  wall.
                </p>
                <div style={{ "margin-top": "32px" }}>
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
        nrOfSteps={5}
        activeStep={getStep()}
        // On re-entry from the dashboard invitation (initialStep > 0) the
        // welcome — with its "set this up later" skip — is behind us; don't let
        // the stepper walk back into it.
        isNoGoBack={(props.initialStep ?? 0) > 0}
        onSetStep={(step) => setStep(step)}
      />
    </div>
  );
};

export default OnboardingAndroid;
