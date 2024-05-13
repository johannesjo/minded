// @ts-ignore
import styles from "./Main.module.scss";
import { createSignal, onMount } from "solid-js";
import { getRndEntry } from "@src/util/getRndEntry";
import { Dashboard } from "@src/shared/components/dashboard/Dashboard";
// @ts-ignore
import { getSyncData } from "@dataInterface/syncDataInterface";
import { addDayTimeDependentClass } from "@src/shared/addDayTimeDependentClass";

const Main = () => {
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
  // return (<Question isUnskippable={true} onSuccessSunTap={()=> undefined} />)

  return (
    <div id="minded-6622-coloured-wrapper" class={styles.NewTab}>
      {<Dashboard />}
    </div>
  );
};

export default Main;
