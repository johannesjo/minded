import { Dashboard } from "@src/shared/components/dashboard/Dashboard";
import { createSignal, onMount } from "solid-js";
// @ts-ignore
import { getSyncData } from "@dataInterface/syncDataInterface";
import { Onboarding } from "@src/shared/components/onboarding/Onboarding";
// @ts-ignore
import styles from "./NewTab.module.scss";
import { getRndEntry } from "@src/util/getRndEntry";
import { addDayTimeDependentClass } from "@src/shared/addDayTimeDependentClass";

const NewTab = () => {
  const [getIsShowInfo, setIsShowInfo] = createSignal(false);
  const [getIsShowOnboarding, setIsShowOnboarding] = createSignal(false);
  const [getTestWebsite, setTestWebsite] = createSignal<string | null>(null);

  onMount(() => {
    addDayTimeDependentClass();

    getSyncData().then((syncData) => {
      if (syncData.cfg.blockedHosts[0]) {
        setTestWebsite(getRndEntry(syncData.cfg.blockedHosts));
      }

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
          {getTestWebsite() ? (
            <p>
              Try it now by visiting{" "}
              <a href={"https://" + getTestWebsite()}>{getTestWebsite()}</a>!
            </p>
          ) : (
            <p>Come back here, once you answered a couple of those.</p>
          )}
        </div>
      ) : (
        <Dashboard />
      )}
    </div>
  );
};

export default NewTab;
