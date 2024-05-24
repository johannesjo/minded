import { createEffect, createSignal, For, Match, Switch } from "solid-js";
import { MissingCapabilityView } from "@src/android/components/missingCapabilities/MissingCapabilities";
import { SettingsAndroid } from "@src/android/components/settingsAndroid/SettingsAndroid";
import ButtonWrapper from "@src/shared/components/ui/ButtonWrapper";
// @ts-ignore
import styles from "./OnboardingAndroid.module.scss";
import { updateUserCfg } from "@src/dataInterface/commonSyncDataInterface";

export const OnboardingAndroid = () => {
  const [getStep, setStep] = createSignal<number>(0);

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
              <div class="h2">
                Welcome to <em>minded</em>! 😊
              </div>
              <div class="txtSlightlyBigger">
                <p>
                  <em>minded</em> will help you to reduce your usage of apps you
                  intend to use less, but have a hard time doing so.
                </p>
                <p>
                  Before we can start there are some small things we need to set
                  up.
                </p>
              </div>

              <ButtonWrapper isVisible={true}>
                <div class="btnTxtBig" onClick={() => setStep(1)}>
                  let's start
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
              <MissingCapabilityView onAllConfigured={() => setStep(3)} />
            </div>
          </Match>
          <Match when={getStep() >= 3}>
            <div class="card pageTransitionIn" style="margin: 32px;">
              <div class="h2">
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
              {/*<ButtonWrapper isVisible={true}>*/}
              {/*  <div class="btnTxtBig"*/}
              {/*       onClick={() => setStep(0)}>Let's start!</div>*/}
              {/*</ButtonWrapper>*/}
            </div>
          </Match>
        </Switch>
      </div>

      <div class={styles.stepper}>
        <For each={[0, 1, 2, 3]}>
          {(step) => (
            <div
              class={`${styles.step} ${
                step === getStep() ? styles.active : ""
              }`}
            >
              {step <= 2 && step + 1}
              {step === 3 && "☀"}
            </div>
          )}
        </For>
      </div>
    </div>
  );
};

export default OnboardingAndroid;
