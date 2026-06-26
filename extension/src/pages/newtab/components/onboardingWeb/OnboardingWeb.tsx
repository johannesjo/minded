import { createSignal, JSX, Match, Switch } from "solid-js";
// @ts-ignore
import { WebsiteList } from "@pages/newtab/components/onboardingWeb/WebsiteList";
import styles from "./OnboardingWeb.module.scss";
// @ts-ignore
import { updateUserCfg } from "@src/dataInterface/commonSyncDataInterface";
import OnboardingSun from "@src/shared/components/interaction/sun/OnboardingSun";
import { companionWord } from "@src/shared/addWrapperClasses";
import Btn from "@src/shared/components/ui/Btn";
import ButtonWrapper from "@src/shared/components/ui/ButtonWrapper";

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
            <OnboardingSun onDismiss={() => setStep(1)} />
            <div class="h2 h2Mindful">
              Meet <em>minded</em>
            </div>
            <div class={styles.infoText}>
              <p>
                This little {companionWord()} is your anchor. When you reach for
                a habit on autopilot, it appears as a calm moment to pause.
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
            <div class="h2 h2Mindful">
              Where should the {companionWord()} meet you?
            </div>
            <div class={styles.infoText}>
              <p>
                Add the sites where you tend to get pulled in. The{" "}
                {companionWord()} shows up only there, nowhere else.
              </p>
            </div>
            <WebsiteList onAfterSave={onAfterSaveWebsites} />
          </div>
        </Match>
      </Switch>
    </div>
  );
};
