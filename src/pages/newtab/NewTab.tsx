import { Dashboard } from "@src/shared/components/dashboard/Dashboard";
import { createSignal, onMount } from "solid-js";
import { getSyncData } from "@src/shared/data/dataInterface";
import { Onboarding } from "@src/shared/components/onboarding/Onboarding";
// @ts-ignore
import styles from "./NewTab.module.scss";

const NewTab = () => {
  const [getIsShowInfo, setIsShowInfo] = createSignal(false);
  const [getIsShowOnboarding, setIsShowOnboarding] = createSignal(false);

  onMount(() => {
    getSyncData().then((syncData) => {
      if (!syncData.answers.length) {
        setIsShowInfo(true);
        if (!syncData.cfg.isOnboardingComplete) {
          setIsShowOnboarding(true);
        }
      }
    });
  });

  // return (<Rating />);
  // return (<Question isUnskippable={true} onSuccess={()=> undefined} />)
  console.log("I am here!");

  return (
    <div id="minded-6622-coloured-wrapper" class={styles.NewTab}>
      {getIsShowOnboarding() ? (
        <Onboarding onComplete={() => setIsShowOnboarding(false)} />
      ) : getIsShowInfo() ? (
        <div class={styles.infoBox}>
          <p>
            <em>minded</em> is now configured.
          </p>
          <p>
            Whenever you open one of the websites a short interaction prompt
            will appear.
          </p>
          <p>
            This will help you break your automatic patterns to visit those
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
