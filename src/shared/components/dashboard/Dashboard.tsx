import { createSignal, JSX, onMount } from "solid-js";
import styles from "./Dashboard.module.scss";
import { getSyncData } from "@src/shared/data/dataInterface";
import { DashboardGroup, DashboardGroupType, } from "@src/shared/components/dashboard/dashboard.model";
import { AnswerList } from "@src/shared/components/dashboard/AnswerList";
import { RndQuote } from "@src/shared/components/dashboard/RndQuote";
import { dashboardEntriesFromQuestions } from '@src/shared/components/dashboard/dashboardEntriesFromQuestions';
import { getRndInt } from '@src/util/getRndInt';
import { QuestionCategoryId } from '@src/shared/data/questions';
import Rating from '@src/shared/components/ui/Rating';


export const Dashboard: () => JSX.Element = () => {
  const [getDashboardGroups, setDashboardGroups] = createSignal<
    DashboardGroup[]
  >([]);
  let focusElI = 0;

  onMount(() => {
    getSyncData().then((syncData) => {
      if(syncData.answers?.length) {
        const entries = dashboardEntriesFromQuestions(syncData.answers);
        focusElI = getRndInt(0, entries.length - 1);
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
              <div className={styles.box}><RndQuote /></div>
            );
          default:
            switch (dg.id) {
              case QuestionCategoryId.XEnergyLevel:
                return (
                  <div className={styles.box}>
                    <div className={styles.standardHeading}>Your Energy Level Today</div>
                    <Rating isShowOnly={true}
                            value={(dg.answers[0] && dg.answers[0].val) as number} />
                  </div>
                );

              default:
                return (
                  <div className={styles.box}><AnswerList dashboardGroup={dg} /></div>
                );
            }
        }
      })}
    </div>
  );
};
