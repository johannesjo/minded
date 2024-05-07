import { createSignal, JSX, onMount } from "solid-js";
import {
  DashboardGroup,
  DashboardGroupMood,
  DashboardGroupType,
} from "@src/shared/components/dashboard/dashboard.model";
import { getSyncData } from "@src/shared/data/syncDataInterface";
import { dashboardEntriesFromQuestions } from "@src/shared/components/dashboard/dashboardEntriesFromQuestions";
// @ts-ignore
import styles from "@src/shared/components/dashboard/DashboardGroups.module.scss";
import { RndQuote } from "@src/shared/components/dashboard/RndQuote";
import { QuestionCategoryId } from "@src/shared/data/questions";
import Rating from "@src/shared/components/ui/Rating";
import { AnswerList } from "@src/shared/components/dashboard/AnswerList";
import { getIsoDate } from "@src/util/getIsoDate";
import { MoodCheckinVal } from "@src/shared/components/interaction/mood-checkin/moodCheckin.const";

export const DashboardGroups: (props: {
  onQuestionCategorySelect?: (question: QuestionCategoryId) => void;
}) => JSX.Element = (props) => {
  const [getDashboardGroups, setDashboardGroups] = createSignal<
    DashboardGroup[]
  >([]);
  const [getBlockedToday, setBlockedToday] = createSignal<number>(0);
  const [getAttemptsToday, setAttemptsToday] = createSignal<number>(0);

  onMount(() => {
    getSyncData().then((syncData) => {
      if (syncData.answers?.length) {
        const entries = dashboardEntriesFromQuestions(syncData);
        console.log(entries, syncData);

        setDashboardGroups(entries);
        const ds = getIsoDate();
        setAttemptsToday(syncData.attempts[ds] || 0);
        setBlockedToday(syncData.blocked[ds] || 0);
      }
    });
  });

  return (
    <div
      nr-of-items={getDashboardGroups().length}
      class={styles.DashboardGroups}
    >
      {getDashboardGroups().map((dg, index) => (
        <div class={styles.box}>
          {index === 4 && (
            <div class={styles.miniSunWrapper}>
              <div class={styles.miniSun} />
            </div>
          )}
          {(() => {
            switch (dg.type) {
              case DashboardGroupType.Stats:
                return (
                  <div
                    class={styles.stats}
                    title={getAttemptsToday() + " visit attempts"}
                  >
                    <div>{getBlockedToday()}</div>
                    <div>Minded Decisions Today</div>
                  </div>
                );
              case DashboardGroupType.MoodCheckin:
                const dgm = dg as DashboardGroupMood;
                return (
                  <div class={styles.moodCheckinWidget}>
                    <div>
                      you feel <span>{dgm.mood}</span> today!
                    </div>
                    {dgm.additionalTxt && <div>{dgm.additionalTxt}</div>}
                    {!dgm.additionalTxt &&
                      (dgm.mood === MoodCheckinVal.Awful ||
                        dgm.mood === MoodCheckinVal.Bad) && (
                        <div>Be very kind to yourself!</div>
                      )}
                  </div>
                );
              case DashboardGroupType.Quote:
                return <RndQuote />;
              default:
                switch (dg.id) {
                  case QuestionCategoryId.XEnergyLevelToday:
                    return (
                      <div class={styles.energyLvl}>
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
                      <AnswerList
                        dashboardGroup={dg}
                        onTitleClick={() =>
                          props.onQuestionCategorySelect(dg.id)
                        }
                      />
                    );
                }
            }
          })()}
        </div>
      ))}
    </div>
  );
};
