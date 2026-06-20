import { createSignal, JSX, Match, Switch } from "solid-js";
// @ts-ignore
import styles from "./OnboardingWeb.module.scss";
import { WebsiteList } from "@pages/newtab/components/onboardingWeb/WebsiteList";
// @ts-ignore
import { updateUserCfg } from "@src/dataInterface/commonSyncDataInterface";
import ButtonWrapper from "@src/shared/components/ui/ButtonWrapper";
import Btn from "@src/shared/components/ui/Btn";

export const OnboardingWeb: (props: {
  onComplete: () => void;
}) => JSX.Element = (props) => {
  const [getStep, setStep] = createSignal<number>(0);

  const onAfterSaveWebsites = async () => {
    await updateUserCfg({ isOnboardingComplete: true });
    props.onComplete();
  };

  return (
    <div class={styles.welcomeWrapper}>
      <Switch>
        <Match when={getStep() === 0}>
          <div class="pageTransitionIn">
            <div class="h2 h2Mindful">
              Meet <em>minded</em> 🌞
            </div>
            <div class={styles.infoText}>
              <p>
                <em>minded</em> isn't here to police your browsing. It's a small
                practice of presence: when you reach for a habit on autopilot, a
                calm little sun appears, so you can pause, notice, and choose —
                no scolding, no streaks, no scores.
              </p>
              <p>The sun is always one gesture away. That's the whole idea.</p>
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
            <div class="h2 h2Mindful">Where should the sun meet you?</div>
            <div class={styles.infoText}>
              <p>
                Add the sites where you tend to get pulled in. The sun will
                quietly show up there — nowhere else.
              </p>
            </div>
            <WebsiteList onAfterSave={onAfterSaveWebsites} />
          </div>
        </Match>
      </Switch>
    </div>
  );
};
