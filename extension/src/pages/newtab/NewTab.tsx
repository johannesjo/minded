import { createSignal, onMount } from "solid-js";
import { getSyncData } from "@src/dataInterface/commonSyncDataInterface";
import { OnboardingWeb } from "@pages/newtab/components/onboardingWeb/OnboardingWeb";
import styles from "./NewTab.module.scss";
import { getRndEntry } from "@src/util/getRndEntry";
import RoutesCmp from "@src/shared/RouteCmp";
import { DEFAULT_TS_VAL } from "@src/dataInterface/syncData.const";
import { SyncData } from "@src/dataInterface/syncData";

const NewTab = () => {
  const [getIsShowInfo, setIsShowInfo] = createSignal(false);
  const [getIsShowOnboarding, setIsShowOnboarding] = createSignal(false);
  const [getTestWebsite, setTestWebsite] = createSignal<string | null>(null);

  onMount(() => {
    getSyncData().then((syncData: SyncData) => {
      if (syncData.cfg.blockedHosts[0]) {
        setTestWebsite(getRndEntry(syncData.cfg.blockedHosts));
      }
      if (
        !syncData.answers.length &&
        syncData.energyLvlTS <= DEFAULT_TS_VAL &&
        syncData.lastBrowsingBehaviorRatingTS <= DEFAULT_TS_VAL
      ) {
        setIsShowInfo(true);
        if (!syncData.cfg.isOnboardingComplete) {
          setIsShowOnboarding(true);
        }
      }
    });
  });

  return (
    <>
      {getIsShowOnboarding() ? (
        <div id="minded-6622-coloured-wrapper">
          <OnboardingWeb onComplete={() => setIsShowOnboarding(false)} />
        </div>
      ) : getIsShowInfo() ? (
        <div id="minded-6622-coloured-wrapper">
          <div class={styles.infoBox}>
            <p>
              <em>minded</em> is now configured.
            </p>
            <p>
              Whenever you open one of the websites a short interaction prompt
              will appear.
            </p>
            <p>
              This can help you notice the automatic habit of opening these
              sites more often than you'd like.
            </p>
            {getTestWebsite() ? (
              <p>
                Try it now by visiting{" "}
                <a href={"https://" + getTestWebsite()}>{getTestWebsite()}</a>.
              </p>
            ) : (
              <p>Come back here once you've answered a couple of those.</p>
            )}
          </div>
        </div>
      ) : (
        <RoutesCmp />
      )}
    </>
  );
};

export default NewTab;
