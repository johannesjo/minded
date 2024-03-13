import { createSignal, JSX, onMount } from "solid-js";
import {
  DashboardGroup,
  DashboardGroupType,
} from "@src/shared/components/dashboard/dashboard.model";
import { getSyncData } from "@src/shared/data/dataInterface";
import { dashboardEntriesFromQuestions } from "@src/shared/components/dashboard/dashboardEntriesFromQuestions";
// @ts-ignore
import styles from "@src/shared/components/dashboard/DashboardGroups.module.scss";
import { RndQuote } from "@src/shared/components/dashboard/RndQuote";
import { QuestionCategoryId } from "@src/shared/data/questions";
import Rating from "@src/shared/components/ui/Rating";
import { AnswerList } from "@src/shared/components/dashboard/AnswerList";

export const DashboardGroups: (props: {
  onQuestionCategorySelect?: (question: QuestionCategoryId) => void;
}) => JSX.Element = (props) => {
  const [getDashboardGroups, setDashboardGroups] = createSignal<
    DashboardGroup[]
  >([]);

  onMount(() => {
    getSyncData().then((syncData) => {
      if (syncData.answers?.length) {
        const entries = dashboardEntriesFromQuestions(syncData.answers);
        setDashboardGroups(entries);
      }
    });
  });

  return (
    <div
      nr-of-items={getDashboardGroups().length}
      class={styles.DashboardGroups}
    >
      {getDashboardGroups().map((dg, index) => {
        switch (dg.type) {
          case DashboardGroupType.Quote:
            return (
              <div class={styles.box}>
                <RndQuote />
              </div>
            );
          default:
            switch (dg.id) {
              case QuestionCategoryId.XEnergyLevelToday:
                return (
                  <div class={styles.box}>
                    <div class={styles.standardHeading}>
                      Your Energy Level Today
                    </div>
                    <Rating
                      isShowOnly={true}
                      value={(dg.answers[0] && dg.answers[0].val) as number}
                    />
                  </div>
                );

              default:
                return (
                  <div class={styles.box}>
                    <AnswerList
                      dashboardGroup={dg}
                      onTitleClick={() => props.onQuestionCategorySelect(dg.id)}
                    />
                  </div>
                );
            }
        }
      })}
    </div>
  );
};
