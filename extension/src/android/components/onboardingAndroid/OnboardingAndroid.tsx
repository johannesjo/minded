import { createEffect, createSignal, Match, Switch } from "solid-js";
import { MissingCapabilityView } from "@src/android/components/missingCapabilities/MissingCapabilities";
import { SettingsAndroid } from "@src/android/components/settingsAndroid/SettingsAndroid";
import ButtonWrapper from "@src/shared/components/ui/ButtonWrapper";
// @ts-ignore
import styles from "./OnboardingAndroid.module.scss";
import { updateUserCfg } from "@src/dataInterface/commonSyncDataInterface";
import { Stepper } from "@src/shared/components/ui/Stepper";

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
                Welcome to <em>minded</em>! 😊
              </div>
              <div class="txtSlightlyBigger">
                <p>
                  <em>minded</em> will help you to reduce the usage of apps that
                  you aim to use less frequently, but struggle to do so.
                </p>
                <p>
                  Before we can start there are some small things we need to set
                  up.
                </p>
              </div>

              <ButtonWrapper isVisible={true}>
                <div class="btnTxtBig" onClick={() => setStep(1)}>
                  let's start!
                </div>
              </ButtonWrapper>
            </div>
          </Match>

          <Match when={getStep() === 1}>
            <div class="pageTransitionIn">
              <SettingsAndroid
                isRouting={false}
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
                  <button
                    class="btnTxt"
                    onClick={() => {
                      setStep(2);
                      setPermissionNotGiven(false);
                    }}
                  >
                    back
                  </button>
                  <button
                    class="btnTxt"
                    onClick={() => props.onGoDashboard()}
                    style="margin-left: 16px;"
                  >
                    continue anyway
                  </button>
                </div>
              </div>
            ) : (
              <div class="card pageTransitionIn" style="margin: 32px;">
                <div class="h2 h2Mindful">
                  <em>minded</em> is now successfully configured! 🎉
                </div>
                <p>
                  Whenever you open one of the apps you configured a short
                  interaction prompt will appear.
                </p>
                <p>
                  This will help you break your automatic patterns to use those
                  apps more often than you like.
                </p>

                <p>Come back here, once you answered a couple of those.</p>
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
