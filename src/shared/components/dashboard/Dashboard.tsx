import { createSignal, JSX, onMount } from "solid-js";
import styles from "./Dashboard.module.scss";
import { getSyncData } from "@src/shared/data/dataInterface";
import { DashboardGroup, DashboardGroupType, } from "@src/shared/components/dashboard/dashboard.model";
import { AnswerList } from "@src/shared/components/dashboard/AnswerList";
import { RndQuote } from "@src/shared/components/dashboard/RndQuote";
import { dashboardEntriesFromQuestions } from '@src/shared/components/dashboard/dashboardEntriesFromQuestions';
import { getRandomInt } from '@src/util/getRndInt';


export const Dashboard: () => JSX.Element = () => {
  const [getDashboardGroups, setDashboardGroups] = createSignal<
    DashboardGroup[]
  >([]);
  let focusElI = 0;

  onMount(() => {
    getSyncData().then((syncData) => {
      if(syncData.answers?.length) {
        const entries = dashboardEntriesFromQuestions(syncData.answers);
        focusElI = getRandomInt(0, entries.length - 1);
        console.log(focusElI);

        setDashboardGroups(entries);
      }
    });
  });

  return (
    <div nr-of-items={getDashboardGroups().length}
         class={styles.Dashboard}>
      {getDashboardGroups().map((dg, index) => {
        switch (dg.type) {
          case DashboardGroupType.Quote:
            return (
              <div className={styles.box + ' ' + (index === focusElI ? styles.isFocus : '')}><RndQuote />
              </div>
            );
          default:
            return (
              <div className={styles.box + ' ' + (index === focusElI ? styles.isFocus : '')}>
                <AnswerList dashboardGroup={dg} />
              </div>
            );
        }
      })}
    </div>
  );
};
