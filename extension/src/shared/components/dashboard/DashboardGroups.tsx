import {
  createEffect,
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
  RE_GREET_DASHBOARD_HIDDEN_EV,
} from "@src/ev.const";
import { useNavigate } from "@solidjs/router";
import {
  DAILY_QUESTION_MORNING_END,
  DailyQuestionsMode,
  getDailyQuestionsMode,
  isShowDailyQuestionsBanner,
} from "@src/shared/components/dailyQuestions/getDailyQuestionsMode";
import { createDashboardCardInteractivity } from "@src/shared/components/dashboard/dashboardCardInteractivity";

// These greetings simply reflect the moment back to the user. In the collapsed
// arrival they can rest directly on the sky; the full look-back view still uses
// cards so every historical entry remains part of one consistent grid.
const PASSIVE_HERO_TYPES: ReadonlySet<DashboardGroupType> = new Set([
  DashboardGroupType.Quote,
  DashboardGroupType.EnergyLvl,
  DashboardGroupType.EmotionLabeling,
]);

export const DashboardGroups: (props: {
  onQuestionCategorySelect?: (categoryId: QuestionCategoryId) => void;
  // When true (the /lookBack route) the full grid renders directly, skipping the
  // calm greeting. "look back" routes here so the view is a real, back-able page.
  forceRevealed?: boolean;
}) => JSX.Element = (props) => {
  let t0: NodeJS.Timeout | undefined;
  // Fires at the end of the shown banner's time window to fade it out, so a card
  // revealed inside its window can't linger past that boundary on a long-open
  // dashboard (see scheduleDailyQuestionsBannerExpiry).
  let bannerExpiry: NodeJS.Timeout | undefined;

  const [getIsShowDailyQuestionsBanner, setIsShowDailyQuestionsBanner] =
    createSignal<boolean>(false);

  // The wording the banner shows ("inspiration for your day" vs "reflect on your
  // day") is captured here, at the same moment `refresh()` decides to reveal the
  // banner - never re-read independently at render time. Reading the clock a
  // second time when the node is *built* let the two drift apart: a dashboard
  // opened before 20:00 built a "Morning" banner node, kept it hidden, and then
  // the evening trigger revealed that stale morning wording late at night.
  const [getDailyQuestionsBannerMode, setDailyQuestionsBannerMode] =
    createSignal<DailyQuestionsMode>("Morning");

  const [
    getIsDailyQuestionsBannerBeingRemoved,
    setIsDailyQuestionsBannerBeingRemoved,
  ] = createSignal<boolean>(false);

  // Arrival is calm: a single greeting (the centre pick - a random
  // reflection, or the quote when there's little to show) instead of the full
  // wall of cards. The rest stay tucked away until you choose to "look back",
  // which routes to the full grid (the /lookBack page) rather than toggling an
  // internal flag - so the grid is a real, back-able view.
  const [getDashboardGroups, setDashboardGroups] = createSignal<
    DashboardGroup[]
  >([]);
  const navigate = useNavigate();

  // The greeting: the centre pick sits at CENTER_INDEX once there are
  // enough cards, and the fallback quote (spliced in last) when there are fewer.
  const heroOf = (groups: DashboardGroup[]): DashboardGroup | undefined => {
    const len = groups.length;
    return groups[len > CENTER_INDEX ? CENTER_INDEX : len - 1];
  };

  // The greeting the user is actually looking at. Deliberately its *own* signal
  // rather than a memo over getDashboardGroups (the live data): the displayed
  // greeting is only ever (re)set when the screen opens or on a deliberate
  // re-greet - which only ever fires while the dashboard is hidden. A routine
  // in-view refresh updates the underlying data (and the "look back" count) but
  // leaves this hero untouched, so the greeting - and its random quote - is
  // never seen to change under the user (calm is the product; a greeting only
  // changes offscreen). Without this, a visible REFRESH_DASHBOARD_EV that
  // altered the group count, re-ran guardHeroSlot, or diffed the hero's data
  // would hand the keyed <Show> a fresh object, remounting the card (a new
  // random quote, a replayed entrance) right in front of the user.
  const [getHeroGroup, setHeroGroup] = createSignal<
    DashboardGroup | undefined
  >();

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
      const showDailyQuestionsBanner = isShowDailyQuestionsBanner(syncData);
      // Lock the wording to this same clock read that just decided to show the
      // banner, so the card can never say "morning" while the evening trigger is
      // what revealed it (and vice versa). Only when revealing - while hidden the
      // mode is irrelevant, and skipping it avoids swapping wording under a user
      // who is already looking at the banner.
      if (showDailyQuestionsBanner) {
        setDailyQuestionsBannerMode(getDailyQuestionsMode());
        scheduleDailyQuestionsBannerExpiry();
      } else {
        window.clearTimeout(bannerExpiry);
      }
      setIsShowDailyQuestionsBanner(showDailyQuestionsBanner);

      // Steer this arrival's greeting away from the tile shown last time we
      // landed, so each return surfaces a fresh one (see greetingMemory).
      const avoidGreetingKey = getLastGreetingKey();
      const existingDashboardGroups = getDashboardGroups();
      let groups: DashboardGroup[];
      if (!reselect && existingDashboardGroups.length) {
        groups = updateDashboardEntriesFromQuestions(
          syncData,
          existingDashboardGroups,
          undefined,
          avoidGreetingKey,
        );
      } else {
        groups = getDashboardEntriesFromQuestions(
          syncData,
          undefined,
          avoidGreetingKey,
        );
      }
      setDashboardGroups(groups);

      // Reveal the greeting the user sees only when the screen is opening (no
      // hero on screen yet) or on a deliberate re-greet - which only ever fires
      // while the dashboard is hidden. A routine in-view refresh (reselect
      // false, hero already shown) deliberately leaves the displayed hero as it
      // is, so the greeting never changes in front of the user; it always just
      // eases in on open and then holds still.
      if (reselect || getHeroGroup() === undefined) {
        setHeroGroup(heroOf(groups));
      }
    });
  };

  // Re-roll the greeting *while the dashboard is hidden from the user* - behind a
  // fading-out interaction overlay, or while the app is backgrounded (Android
  // pause). The swap is instant: the fresh tile mounts and plays its own gentle
  // entrance behind the cover, so it's already in place - gently easing in, and
  // the only card ever seen - by the time the dashboard is revealed. A card is
  // never changed in front of the user (calm is the product); it only ever
  // changes offscreen. The grid view has no single greeting, so it sits this out.
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
    window.addEventListener(RE_GREET_DASHBOARD_HIDDEN_EV, reGreetHidden);
  });

  onCleanup(() => {
    window.removeEventListener(REFRESH_DASHBOARD_EV, onRefreshEv);
    window.removeEventListener(RE_GREET_DASHBOARD_HIDDEN_EV, reGreetHidden);
    window.clearTimeout(t0);
    window.clearTimeout(bannerExpiry);
  });

  // Route to the full "look back" grid. The global page-transition guard
  // (useBeforeLeave in RouteCmp) already fades the leaving greeting out before
  // the destination eases in, so this navigates like any other card tap - no
  // local fade-out (a second one only stacked into an awkward double pause).
  // Routing (not an internal flag) makes it a real page: the global bottom bar
  // shows its back arrow there, exactly like settings.
  const revealAll = () => navigate("/lookBack");

  // Fade the banner out (soft, never a snap) and unmount it once the fade
  // finishes. Shared by the user's explicit "no" dismissal and the automatic
  // window-boundary expiry below.
  const fadeOutDailyQuestionsBanner = () => {
    setIsDailyQuestionsBannerBeingRemoved(true);
    window.clearTimeout(t0);
    // Matches the --dur-soft fade-out on .isBeingRemoved so the node stays
    // mounted for the full fade instead of being pulled out mid-transition.
    t0 = setTimeout(() => {
      setIsShowDailyQuestionsBanner(false);
      // Reset so a later reveal (e.g. the evening banner) starts fully visible
      // rather than mid-fade.
      setIsDailyQuestionsBannerBeingRemoved(false);
    }, 480);
  };

  const removeDailyQuestionsBanner = () => {
    setDailyQuestionsDoneForToday(getDailyQuestionsBannerMode());
    fadeOutDailyQuestionsBanner();
  };

  // Fade the banner out when its time window closes, so a card revealed
  // legitimately inside its window - the morning "inspiration" card before noon,
  // the evening card before the day rolls over - can't linger past that boundary
  // on a dashboard left open for hours. Without this, only an explicit refresh
  // event would ever re-hide it, which is how a morning card once surfaced at
  // 23:59. Re-armed on every refresh that shows the banner.
  const scheduleDailyQuestionsBannerExpiry = () => {
    window.clearTimeout(bannerExpiry);
    const now = new Date();
    const windowEnd = new Date(now);
    if (getDailyQuestionsBannerMode() === "Morning") {
      windowEnd.setHours(DAILY_QUESTION_MORNING_END, 0, 0, 0);
    } else {
      // End of the day; past midnight the mode/visibility no longer resolve to
      // "Evening" anyway.
      windowEnd.setHours(24, 0, 0, 0);
    }
    const msUntilWindowEnd = windowEnd.getTime() - now.getTime();
    if (msUntilWindowEnd <= 0) {
      fadeOutDailyQuestionsBanner();
      return;
    }
    bannerExpiry = setTimeout(fadeOutDailyQuestionsBanner, msUntilWindowEnd);
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
        {getDailyQuestionsBannerMode() === "Morning"
          ? "Would you like some inspiration for your day?"
          : "Would you like to reflect on your day?"}
      </div>
      <div class={styles.cardDailyQuestionsBtns}>
        <Btn onClick={() => navigate("/dailyQuestions")}>stay a moment</Btn>
        <Btn soft onClick={() => removeDailyQuestionsBanner()}>
          not now
        </Btn>
      </div>
    </div>
  );

  const renderCard = (dg: DashboardGroup, isSingleCard = false) => {
    const isSkyGreeting = isSingleCard && PASSIVE_HERO_TYPES.has(dg.type);
    // Energy/emotion can stay visually quiet on the sky, but when either is the
    // only dashboard group there is no "look back" route beneath it. Keep that
    // sole route clickable and keyboard-accessible. A quote has no id, so it
    // remains a genuinely passive greeting; with multiple groups, look-back
    // remains the one calm navigation affordance.
    const isInteractive = createDashboardCardInteractivity({
      hasId: "id" in dg,
      isSingleCard,
      isSkyGreeting,
      getGroupCount: () => getDashboardGroups().length,
    });
    const activate = () => {
      if (isInteractive() && "id" in dg) {
        props.onQuestionCategorySelect?.(dg.id);
      }
    };
    return (
      <div
        onClick={activate}
        role={isInteractive() ? "button" : undefined}
        tabindex={isInteractive() ? 0 : undefined}
        onKeyDown={(e) => {
          if (isInteractive() && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            activate();
          }
        }}
        classList={{
          ["cardDashboard"]: !isSkyGreeting,
          [styles.box]: true,
          [styles.singleCard]: isSingleCard,
          [styles.skyGreeting]: isSkyGreeting,
          [styles.interactive]: isInteractive(),
          [styles.centerItem]: dg.type !== DashboardGroupType.TxtQuestion,
        }}
      >
        {(() => {
          switch (dg.type) {
            case DashboardGroupType.Quote:
              return <RndQuote />;

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
        <div class={styles.collapsed}>
          <Show
            when={getIsShowDailyQuestionsBanner()}
            fallback={
              // `keyed` so a fresh pick remounts the card and replays its gentle
              // entrance fade-in (see .collapsed .box). Re-greets only ever happen
              // while hidden, so the fresh tile is already easing in when revealed
              // - no in-view swap wrapper needed.
              <Show when={getHeroGroup()} keyed>
                {(g) => renderCard(g, true)}
              </Show>
            }
          >
            {renderDailyQuestionsBanner()}
          </Show>

          <Show when={getDashboardGroups().length > 1}>
            <Btn plain class={styles.revealBtn} onClick={revealAll}>
              look back
            </Btn>
          </Show>
        </div>
      }
    >
      <div
        classList={{
          [styles.DashboardGroups]: true,
          [styles.shortCollection]: getDashboardGroups().length <= 4,
          [styles.balancedFourCardGrid]: getDashboardGroups().length === 4,
        }}
      >
        <For each={getDashboardGroups()}>{(dg) => renderCard(dg)}</For>
      </div>
    </Show>
  );
};
