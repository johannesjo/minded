import { createSignal, JSX, onCleanup, onMount } from "solid-js";
import {
  DashboardGroup,
  DashboardGroupBrowsingBehavior,
  DashboardGroupEnergyLvl,
  DashboardGroupMood,
  DashboardGroupStats,
  DashboardGroupTxtQuestion,
  DashboardGroupType,
} from "@src/shared/components/dashboard/dashboard.model";
// @ts-expect-error
import { getSyncData } from "@dataInterface/syncDataInterface";
import { getDashboardEntriesFromQuestions } from "@src/shared/components/dashboard/getDashboardEntriesFromQuestions";
// @ts-expect-error
import styles from "@src/shared/components/dashboard/DashboardGroups.module.scss";
import { RndQuote } from "@src/shared/components/dashboard/dashboardCards/RndQuote";
import { QuestionCategoryId } from "@src/shared/data/questions";
import Rating from "@src/shared/components/ui/Rating";
import { AnswerList } from "@src/shared/components/dashboard/AnswerList";
import { MoodCheckinVal } from "@src/shared/components/interaction/mood-checkin/moodCheckin.const";
import Chart from "@src/shared/components/ui/Chart";
import { getBrowsingBehaviorChartData } from "@src/shared/components/interaction/browsing-behavior-rating/getBrowsingBehaviorChartData";
// @ts-expect-error
import { IS_ANDROID } from "@dataInterface/isAndroid";
import { updateDashboardEntriesFromQuestions } from "@src/shared/components/dashboard/updateDashboardEntries";
import { REFRESH_DASHBOARD_EV } from "@src/ev.const";

export const DashboardGroups: (props: {
  onQuestionCategorySelect?: (question: QuestionCategoryId) => void;
}) => JSX.Element = (props) => {
  const [getDashboardGroups, setDashboardGroups] = createSignal<
    DashboardGroup[]
  >([]);

  const refresh = () => {
    getSyncData().then((syncData) => {
      const existingDashboardGroups = getDashboardGroups();
      if (existingDashboardGroups) {
        const entries = getDashboardEntriesFromQuestions(syncData);
        setDashboardGroups(entries);
      } else {
        setDashboardGroups(
          updateDashboardEntriesFromQuestions(
            syncData,
            existingDashboardGroups,
          ),
        );
      }
    });
  };

  onMount(() => {
    refresh();
    window.addEventListener(REFRESH_DASHBOARD_EV, refresh);
  });

  onCleanup(() => {
    window.removeEventListener(REFRESH_DASHBOARD_EV, refresh);
  });

  return (
    <div
      nr-of-items={getDashboardGroups().length}
      class={styles.DashboardGroups}
    >
      {/* TODO refactor */}
      {/* eslint-disable-next-line solid/prefer-for */}
      {getDashboardGroups().map((dg) => (
        <div
          onClick={() =>
            (dg as DashboardGroupTxtQuestion).id &&
            props.onQuestionCategorySelect((dg as DashboardGroupTxtQuestion).id)
          }
          classList={{
            card: true,
            [styles.box]: true,
            [styles.interactive]: dg.type === DashboardGroupType.TxtQuestion,
            [styles.centerItem]:
              dg.type !== DashboardGroupType.TxtQuestion &&
              dg.type !== DashboardGroupType.BrowsingBehaviorRating,
          }}
        >
          {(() => {
            switch (dg.type) {
              case DashboardGroupType.BrowsingBehaviorRating:
                // eslint-disable-next-line no-case-declarations
                const rd = (dg as DashboardGroupBrowsingBehavior).data;
                return (
                  <div class={styles.browsingBehaviorGraph}>
                    <div>
                      {IS_ANDROID
                        ? "bad app usage rating over time"
                        : "browsing behavior over time"}
                    </div>
                    <Chart chartData={getBrowsingBehaviorChartData(rd)} />
                  </div>
                );
              case DashboardGroupType.Stats:
                // eslint-disable-next-line no-case-declarations
                const dgs = dg as DashboardGroupStats;
                return (
                  <div class={styles.stats}>
                    <div title="'minded' decisions are counted every time when you leave a website by clicking the sun.">
                      minded decisions today
                    </div>
                    <div
                      title={
                        dgs.attempts + " website visit attempts today in total"
                      }
                    >
                      {dgs.sunTaps}
                    </div>
                  </div>
                );
              case DashboardGroupType.MoodCheckin:
                // eslint-disable-next-line no-case-declarations
                const dgm = dg as DashboardGroupMood;
                return (
                  <div class={styles.moodCheckinWidget}>
                    <div class={styles.moodCheckinWidgetTxt}>
                      you feel <span>{dgm.mood}</span> today!
                    </div>
                    <div>
                      {dgm.additionalTxt}
                      {!dgm.additionalTxt &&
                        (dgm.mood === MoodCheckinVal.Awful ||
                          dgm.mood === MoodCheckinVal.Bad) &&
                        "Be very kind to yourself!"}
                    </div>
                  </div>
                );
              case DashboardGroupType.Quote:
                return <RndQuote />;

              case DashboardGroupType.EnergyLvl:
                // eslint-disable-next-line no-case-declarations
                const dge = dg as DashboardGroupEnergyLvl;
                return (
                  <div class={styles.energyLvl}>
                    <div class={styles.standardHeading}>
                      your energy level today
                    </div>
                    <Rating isShowOnly={true} value={dge.energyLvl} />
                  </div>
                );

              default:
                return <AnswerList dashboardGroup={dg} />;
            }
          })()}
        </div>
      ))}
    </div>
  );
};
