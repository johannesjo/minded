import { JSX } from "solid-js";
// @ts-ignore
import styles from "./OnboardingWeb.module.scss";
import { WebsiteList } from "@src/shared/components/onboardingWeb/WebsiteList";
// @ts-ignore
import { updateUserCfg } from "@src/dataInterface/commonSyncDataInterface";

export const OnboardingWeb: (props: {
  onComplete: () => void;
}) => JSX.Element = (props) => {
  const onAfterSaveWebsites = async () => {
    await updateUserCfg({ isOnboardingComplete: true });
    props.onComplete();
  };
  return (
    <>
      <div class={styles.welcomeWrapper}>
        <div
          classList={{
            ["h2"]: true,
            [styles.welcomeText]: true,
          }}
        >
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
