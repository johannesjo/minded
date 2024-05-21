import { createSignal, JSX, onMount } from "solid-js";
import {
  DashboardGroup,
  DashboardGroupBrowsingBehavior,
  DashboardGroupEnergyLvl,
  DashboardGroupMood,
  DashboardGroupStats,
  DashboardGroupType,
} from "@src/shared/components/dashboard/dashboard.model";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
import { getSyncData } from "@dataInterface/syncDataInterface";
import { getDashboardEntriesFromQuestions } from "@src/shared/components/dashboard/getDashboardEntriesFromQuestions";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
import styles from "@src/shared/components/dashboard/DashboardGroups.module.scss";
import { RndQuote } from "@src/shared/components/dashboard/dashboardCards/RndQuote";
import { QuestionCategoryId } from "@src/shared/data/questions";
import Rating from "@src/shared/components/ui/Rating";
import { AnswerList } from "@src/shared/components/dashboard/AnswerList";
import { getIsoDate } from "@src/util/getIsoDate";
import { MoodCheckinVal } from "@src/shared/components/interaction/mood-checkin/moodCheckin.const";
import Chart from "@src/shared/components/ui/Chart";
import { getBrowsingBehaviorChartData } from "@src/shared/components/interaction/browsing-behavior-rating/getBrowsingBehaviorChartData";
import { IS_ANDROID } from "@src/dataInterface/extension/isAndroid";

export const DashboardGroups: (props: {
  onQuestionCategorySelect?: (question: QuestionCategoryId) => void;
}) => JSX.Element = (props) => {
  const [getDashboardGroups, setDashboardGroups] = createSignal<
    DashboardGroup[]
  >([]);
  const [getSunTapsToday, setSunTapsToday] = createSignal<number>(0);
  const [getAttemptsToday, setAttemptsToday] = createSignal<number>(0);

  const refresh = () => {
    getSyncData().then((syncData) => {
      console.log(syncData);

      if (syncData.answers?.length) {
        const entries = getDashboardEntriesFromQuestions(syncData);
        console.log(entries, syncData);

        setDashboardGroups(entries);
        const ds = getIsoDate();
        setAttemptsToday(syncData.attempts[ds] || 0);
        setSunTapsToday(syncData.blocked[ds] || 0);
      }
    });
  };

  onMount(() => {
    refresh();
  });

  return (
    <div
      nr-of-items={getDashboardGroups().length}
      class={styles.DashboardGroups}
    >
      {getDashboardGroups().map((dg, index) => (
        <div
          class={`${styles.box} ${
            dg.type !== DashboardGroupType.Standard &&
            dg.type !== DashboardGroupType.BrowsingBehaviorRating
              ? styles.centerItem
              : ""
          }`}
        >
          {index === 4 && (
            <div class={styles.miniSunWrapper}>
              <div class={styles.miniSun} />
            </div>
          )}
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
                return (
                  <AnswerList
                    dashboardGroup={dg}
                    onTitleClick={() => props.onQuestionCategorySelect(dg.id)}
                  />
                );
            }
          })()}
        </div>
      ))}
    </div>
  );
};
