import { createEffect, createSignal, Match, Switch } from "solid-js";
import { MissingCapabilityView } from "@src/android/components/missingCapabilities/MissingCapabilities";
import { SettingsAndroid } from "@src/android/components/settingsAndroid/SettingsAndroid";
import ButtonWrapper from "@src/shared/components/ui/ButtonWrapper";
// @ts-ignore
import styles from "./OnboardingAndroid.module.scss";
import { updateUserCfg } from "@src/dataInterface/commonSyncDataInterface";
import { Stepper } from "@src/shared/components/ui/Stepper";
import Btn from "@src/shared/components/ui/Btn";

export const OnboardingAndroid = (props: { onGoDashboard: () => void }) => {
  const [getStep, setStep] = createSignal<number>(0);
  const [getPermissionNotGiven, setPermissionNotGiven] =
    createSignal<boolean>(false);

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
                  <em>minded</em> isn't here to lock you out of anything. It's a
                  small practice of presence: when you open an app on autopilot,
                  a calm little sun appears, so you can pause, notice, and choose
                  — no scolding, no streaks, no scores.
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
              </div>
            )}
          </Match>
        </Switch>
      </div>

      <Stepper
        nrOfSteps={4}
        activeStep={getStep()}
        onSetStep={(step) => setStep(step)}
        labelFn={(step) =>
          step === 3 ? (getPermissionNotGiven() ? "🙁" : "🌞") : undefined
        }
      />
    </div>
  );
};

export default OnboardingAndroid;
