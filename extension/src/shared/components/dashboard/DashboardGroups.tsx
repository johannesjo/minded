import {
  createEffect,
  createMemo,
  createSignal,
  For,
  JSX,
  onCleanup,
  onMount,
  Show,
} from "solid-js";
import {
  DashboardGroup,
  DashboardGroupEmotionLabeling,
  DashboardGroupEnergyLvl,
  DashboardGroupSelAssessment,
  DashboardGroupType,
} from "@src/shared/components/dashboard/dashboard.model";
import {
  getSyncData,
  setDailyQuestionsDoneForToday,
} from "@src/dataInterface/commonSyncDataInterface";
import {
  CENTER_INDEX,
  getDashboardEntriesFromQuestions,
  getGreetingKey,
} from "@src/shared/components/dashboard/getDashboardEntriesFromQuestions";
import {
  getLastGreetingKey,
  setLastGreetingKey,
} from "@src/shared/components/dashboard/greetingMemory";
import styles from "@src/shared/components/dashboard/DashboardGroups.module.scss";
import { RndQuote } from "@src/shared/components/dashboard/dashboardCards/RndQuote";
import { QuestionCategoryId } from "@src/shared/data/questions";
import Rating from "@src/shared/components/ui/Rating";
import Btn from "@src/shared/components/ui/Btn";
import { DashboardAnswerList } from "@src/shared/components/dashboard/DashboardAnswerList";
import { updateDashboardEntriesFromQuestions } from "@src/shared/components/dashboard/updateDashboardEntries";
import {
  REFRESH_DASHBOARD_EV,
  RE_GREET_DASHBOARD_EV,
  RE_GREET_DASHBOARD_HIDDEN_EV,
} from "@src/ev.const";
import { SelfAssessmentCard } from "@src/shared/components/dashboard/dashboardCards/SelfAssessmentCard";
import { useNavigate } from "@solidjs/router";
import {
  getDailyQuestionsMode,
  isShowDailyQuestionsBanner,
} from "@src/shared/components/dailyQuestions/getDailyQuestionsMode";
import { PAGE_FADE_MS } from "@src/util/animation";
import { prefersReducedMotion } from "@src/util/prefersReducedMotion";

// Matches the --dur-soft fade on the collapsed view so it finishes fading out
// before the full set mounts (mirrors the daily-questions banner dismissal).
const REVEAL_FADE_MS = 480;

// How long the current greeting fades out before it's swapped for a fresh one
// on re-greet — matches the page fade so the swap eases at the same calm pace as
// every other transition (never a hard cut).
const GREETING_SWAP_FADE_MS = PAGE_FADE_MS;

export const DashboardGroups: (props: {
  onQuestionCategorySelect?: (categoryId: QuestionCategoryId) => void;
  // When true (the /lookBack route) the full grid renders directly, skipping the
  // calm greeting. "show all" routes here so the view is a real, back-able page.
  forceRevealed?: boolean;
}) => JSX.Element = (props) => {
  let t0: NodeJS.Timeout | undefined;
  let revealT0: NodeJS.Timeout | undefined;
  let greetingSwapT0: NodeJS.Timeout | undefined;

  // Drives the soft fade-out of the current greeting while it's swapped for a
  // fresh one on re-greet (the new tile fades back in via its own entrance).
  const [getIsGreetingSwapping, setIsGreetingSwapping] =
    createSignal<boolean>(false);

  const [getIsShowDailyQuestionsBanner, setIsShowDailyQuestionsBanner] =
    createSignal<boolean>(false);

  const [
    getIsDailyQuestionsBannerBeingRemoved,
    setIsDailyQuestionsBannerBeingRemoved,
  ] = createSignal<boolean>(false);

  // Arrival is calm: a single greeting card (the centre pick — a random
  // reflection, or the quote when there's little to show) instead of the full
  // wall of cards. The rest stay tucked away until you choose to "look back",
  // which routes to the full grid (the /lookBack page) rather than toggling an
  // internal flag — so the grid is a real, back-able view. `isRevealing` just
  // drives the greeting's soft fade-out before that navigation.
  const [getIsRevealing, setIsRevealing] = createSignal<boolean>(false);

  const [getDashboardGroups, setDashboardGroups] = createSignal<
    DashboardGroup[]
  >([]);
  const navigate = useNavigate();

  // The greeting card: the centre pick sits at CENTER_INDEX once there are
  // enough cards, and the fallback quote (spliced in last) when there are fewer.
  const getHeroIndex = createMemo(() => {
    const len = getDashboardGroups().length;
    return len > CENTER_INDEX ? CENTER_INDEX : len - 1;
  });
  const getHeroGroup = createMemo(() => getDashboardGroups()[getHeroIndex()]);

  // Remember the tile we actually greeted with, so the next arrival can pick a
  // different one. Tracking the rendered hero (rather than the raw pick) keeps
  // the memory honest when a refresh preserves the existing greeting.
  createEffect(() => {
    const hero = getHeroGroup();
    if (hero) setLastGreetingKey(getGreetingKey(hero));
  });

  // `reselect` forces a brand-new greeting pick (a fresh arrival); otherwise we
  // update in place, preserving the current arrangement so a routine data
  // refresh never reshuffles the tile under the user.
  const refresh = (reselect = false) => {
    return getSyncData().then((syncData) => {
      setIsShowDailyQuestionsBanner(isShowDailyQuestionsBanner(syncData));

      // Steer this arrival's greeting away from the tile shown last time we
      // landed, so each return surfaces a fresh one (see greetingMemory).
      const avoidGreetingKey = getLastGreetingKey();
      const existingDashboardGroups = getDashboardGroups();
      if (!reselect && existingDashboardGroups.length) {
        const upd = updateDashboardEntriesFromQuestions(
          syncData,
          existingDashboardGroups,
          undefined,
          avoidGreetingKey,
        );
        setDashboardGroups(upd);
      } else {
        const entries = getDashboardEntriesFromQuestions(
          syncData,
          undefined,
          avoidGreetingKey,
        );
        setDashboardGroups(entries);
      }
    });
  };

  // Landing back on the dashboard (app resume, or closing an interaction
  // overlay) without the view remounting: re-roll the greeting so the tile feels
  // fresh rather than frozen on whatever it was last time. The grid view has no
  // single greeting, so it sits this out.
  const reGreet = () => {
    if (props.forceRevealed) return;
    if (prefersReducedMotion()) {
      refresh(true);
      return;
    }
    // Fade the current tile out, swap in the fresh pick *while invisible*, then
    // ease the new one back in — so the change reads as a calm cross-fade rather
    // than a content pop.
    setIsGreetingSwapping(true);
    window.clearTimeout(greetingSwapT0);
    greetingSwapT0 = setTimeout(() => {
      refresh(true).then(() => {
        // Let the fresh tile paint at opacity 0 before easing it back in.
        requestAnimationFrame(() => setIsGreetingSwapping(false));
      });
    }, GREETING_SWAP_FADE_MS);
  };

  // Re-greet *now*, instantly, while the dashboard is still hidden behind a
  // fading-out overlay (an interaction closing). No cross-fade: the fresh tile
  // mounts and plays its own gentle entrance behind the cover, so it's already in
  // place — gently easing in, and the only card you ever see — when the overlay
  // reveals it. (The in-view cross-fade above is only needed with nothing covering us.)
  const reGreetHidden = () => {
    if (props.forceRevealed) return;
    refresh(true);
  };

  // A plain wrapper so the event object isn't passed as `reselect` (which would
  // force a reshuffle on every routine data refresh).
  const onRefreshEv = () => refresh();

  onMount(() => {
    refresh();
    window.addEventListener(REFRESH_DASHBOARD_EV, onRefreshEv);
    window.addEventListener(RE_GREET_DASHBOARD_EV, reGreet);
    window.addEventListener(RE_GREET_DASHBOARD_HIDDEN_EV, reGreetHidden);
  });

  onCleanup(() => {
    window.removeEventListener(REFRESH_DASHBOARD_EV, onRefreshEv);
    window.removeEventListener(RE_GREET_DASHBOARD_EV, reGreet);
    window.removeEventListener(RE_GREET_DASHBOARD_HIDDEN_EV, reGreetHidden);
    window.clearTimeout(t0);
    window.clearTimeout(revealT0);
    window.clearTimeout(greetingSwapT0);
  });

  // Fade the calm greeting out, then route to the full "look back" grid so it
  // eases over rather than hard-cutting (see the "transitions — always soft"
  // styling rule). Routing (not an internal flag) makes it a real page: the
  // global bottom bar shows its back arrow there, exactly like settings.
  const revealAll = () => {
    setIsRevealing(true);
    window.clearTimeout(revealT0);
    revealT0 = setTimeout(() => navigate("/lookBack"), REVEAL_FADE_MS);
  };

  const removeDailyQuestionsBanner = () => {
    setIsDailyQuestionsBannerBeingRemoved(true);
    setDailyQuestionsDoneForToday(getDailyQuestionsMode());
    window.clearTimeout(t0);
    // Matches the --dur-soft fade-out on .isBeingRemoved so the node stays
    // mounted for the full fade instead of being pulled out mid-transition.
    t0 = setTimeout(() => {
      setIsShowDailyQuestionsBanner(false);
    }, 480);
  };

  const renderDailyQuestionsBanner = () => (
    <div
      classList={{
        ["cardDashboard"]: true,
        [styles.box]: true,
        [styles.centerItem]: true,
        [styles.cardDailyQuestions]: true,
        [styles.isBeingRemoved]: getIsDailyQuestionsBannerBeingRemoved(),
      }}
    >
      <div class="txtSlightlyBigger">
        {getDailyQuestionsMode() === "Morning"
          ? "Would you like some inspiration for your day?"
          : "Would you like to reflect on your day?"}
      </div>
      <div class={styles.cardDailyQuestionsBtns}>
        <Btn outline onClick={() => navigate("/dailyQuestions")}>
          let's go
        </Btn>
        <Btn outline onClick={() => removeDailyQuestionsBanner()}>
          no
        </Btn>
      </div>
    </div>
  );

  const renderCard = (dg: DashboardGroup) => {
    const isInteractive =
      "id" in dg || dg.type === DashboardGroupType.SleepWindDown;
    const activate = () => {
      if (dg.type === DashboardGroupType.SleepWindDown) {
        navigate("/sleepWindDown");
        return;
      }
      if ("id" in dg) props.onQuestionCategorySelect?.(dg.id);
    };
    return (
      <div
        onClick={activate}
        role={isInteractive ? "button" : undefined}
        tabindex={isInteractive ? 0 : undefined}
        onKeyDown={
          isInteractive
            ? (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  activate();
                }
              }
            : undefined
        }
        classList={{
          ["cardDashboard"]: true,
          [styles.box]: true,
          [styles.interactive]: isInteractive,
          [styles.centerItem]:
            dg.type !== DashboardGroupType.TxtQuestion &&
            dg.type !== DashboardGroupType.SelfAssessment,
        }}
      >
        {(() => {
          switch (dg.type) {
            case DashboardGroupType.SleepWindDown:
              return (
                <div>
                  <div class="dashboardHeading">wind down for sleep</div>
                  <div class="fatTxt">it's getting late</div>
                </div>
              );
            case DashboardGroupType.Quote:
              return <RndQuote />;

            case DashboardGroupType.SelfAssessment:
              // eslint-disable-next-line no-case-declarations
              const dgSA = dg as DashboardGroupSelAssessment;
              return (
                <SelfAssessmentCard selfAssessmentEntries={dgSA.entries} />
              );

            case DashboardGroupType.EnergyLvl:
              // eslint-disable-next-line no-case-declarations
              const dge = dg as DashboardGroupEnergyLvl;
              return (
                <div class={styles.energyLvl}>
                  <div class="dashboardHeading">your energy level today</div>
                  <Rating isShowOnly={true} value={dge.energyLvl} />
                </div>
              );

            case DashboardGroupType.EmotionLabeling:
              // eslint-disable-next-line no-case-declarations
              const dgEl = dg as DashboardGroupEmotionLabeling;
              return (
                <div>
                  <div class="dashboardHeading">your emotions today</div>
                  <div class="dashboardContent">{dgEl.emotions.join(", ")}</div>
                </div>
              );

            default:
              return <DashboardAnswerList dashboardGroup={dg} />;
          }
        })()}
      </div>
    );
  };

  return (
    <Show
      when={props.forceRevealed}
      fallback={
        <div
          classList={{
            [styles.collapsed]: true,
            [styles.isRevealing]: getIsRevealing(),
          }}
        >
          <Show
            when={getIsShowDailyQuestionsBanner()}
            fallback={
              <div
                classList={{
                  [styles.greetingSwap]: true,
                  [styles.isSwapping]: getIsGreetingSwapping(),
                }}
              >
                {/* `keyed` so a fresh pick remounts the card and replays its
                    gentle entrance fade-in (see .collapsed .box). */}
                <Show when={getHeroGroup()} keyed>
                  {(g) => renderCard(g)}
                </Show>
              </div>
            }
          >
            {renderDailyQuestionsBanner()}
          </Show>

          <Show when={getDashboardGroups().length > 1}>
            <Btn outline class={styles.revealBtn} onClick={revealAll}>
              show all
            </Btn>
          </Show>
        </div>
      }
    >
      <div class={styles.DashboardGroups}>
        <For each={getDashboardGroups()}>{(dg) => renderCard(dg)}</For>
      </div>
    </Show>
  );
};
