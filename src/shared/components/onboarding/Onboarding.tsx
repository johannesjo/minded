import { JSX } from "solid-js";
import styles from "./Onboarding.module.scss";
import { WebsiteList } from "@src/shared/components/onboarding/WebsiteList";
import { updateCfg } from "@src/shared/data/syncDataInterface";

export const Onboarding: (props: { onComplete: () => void }) => JSX.Element = (
  props,
) => {
  const onAfterSaveWebsites = async () => {
    await updateCfg({ isOnboardingComplete: true });
    props.onComplete();
  };
  return (
    <>
      <div class={styles.welcomeWrapper}>
        <div class={styles.welcome}>
          Welcome to <em>minded</em>
        </div>
        <div class={styles.infoText}>
          <p>Which websites do you intent to use less?</p>
        </div>

        <WebsiteList onAfterSave={onAfterSaveWebsites} />
      </div>
    </>
  );
};
