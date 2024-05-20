import { createSignal, onMount } from "solid-js";
// @ts-ignore
import { getSyncData } from "@dataInterface/syncDataInterface";
import { OnboardingWeb } from "@src/shared/components/onboardingWeb/OnboardingWeb";
// @ts-ignore
import styles from "./NewTab.module.scss";
import { getRndEntry } from "@src/util/getRndEntry";
import { addDayTimeDependentClass } from "@src/shared/addDayTimeDependentClass";
import RoutesCmp from "@src/shared/RouteCmp";

const NewTab = () => {
  const [getIsShowInfo, setIsShowInfo] = createSignal(false);
  const [getIsShowOnboarding, setIsShowOnboarding] = createSignal(false);
  const [getTestWebsite, setTestWebsite] = createSignal<string | null>(null);

  onMount(() => {
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

  return (
    <div id="minded-6622-coloured-wrapper">
      {getIsShowOnboarding() ? (
        <OnboardingWeb onComplete={() => setIsShowOnboarding(false)} />
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
        <RoutesCmp />
      )}
    </div>
  );
};

export default NewTab;
