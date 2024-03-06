import { Dashboard } from "@src/shared/components/dashboard/Dashboard";
import { createSignal, onMount } from "solid-js";
import { getSyncData } from "@src/shared/data/dataInterface";
import { Onboarding } from "@src/shared/components/Onboarding";
import styles from "./NewTab.module.scss";

const NewTab = () => {
  const [getIsShowInfo, setIsShowInfo] = createSignal(false);
  const [getIsShowOnboarding, setIsShowOnboarding] = createSignal(false);

  onMount(() => {
    getSyncData().then((syncData) => {
      if (!syncData.answers.length) {
        if (syncData.cfg.isOnboardingComplete) {
          setIsShowInfo(true);
        } else {
          setIsShowOnboarding(true);
        }
      }
    });
  });

  return (
    <div id="minded-6622-coloured-wrapper" class={styles.NewTab}>
      {getIsShowOnboarding() ? (
        <Onboarding onComplete={() => setIsShowOnboarding(false)} />
      ) : getIsShowInfo() ? (
        <div class={styles.infoBox}>
          <p>
            Minded is now configured. Whenever you open one of the websites a
            short interaction prompt will appear.
          </p>
          <p>
            This will help you breaking your automatic patterns to visit those
            websites more often than you like.
          </p>
          <p>Come back here, once you answered a couple of those.</p>
        </div>
      ) : (
        <Dashboard />
      )}
    </div>
  );
};

export default NewTab;
