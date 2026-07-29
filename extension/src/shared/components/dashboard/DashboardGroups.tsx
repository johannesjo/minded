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
import { CustomQuestion } from "@src/dataInterface/syncData";
import {
  CENTER_INDEX,
  getDashboardEntriesFromQuestions,
  getGreetingKey,
  isGreetingEligible,
} from "@src/shared/components/dashboard/getDashboardEntriesFromQuestions";
import {
  getLastGreetingKey,
  setLastGreetingKey,
  takeReGreetRequest,
} from "@src/shared/components/dashboard/greetingMemory";
import { decideGreeting } from "@src/shared/components/dashboard/greetingDecision";
import styles from "@src/shared/components/dashboard/DashboardGroups.module.scss";
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
import { getQuickPause } from "@src/shared/components/dailyQuestions/getQuickPause";
import { createDashboardCardInteractivity } from "@src/shared/components/dashboard/dashboardCardInteractivity";
import { createCompanionWord } from "@src/shared/addWrapperClasses";

// These greetings simply reflect the moment back to the user. In the collapsed
// arrival they can rest directly on the sky; the full look-back view still uses
// cards so every historical entry remains part of one consistent grid.
const PASSIVE_HERO_TYPES: ReadonlySet<DashboardGroupType> = new Set([
  DashboardGroupType.EnergyLvl,
  DashboardGroupType.EmotionLabeling,
]);

// Matches the --dur-soft fade-out on `.emptySky.isBeingRemoved`, so the words
// stay mounted for the whole fade (same pairing as the banner's 480ms above).
const EMPTY_SKY_FADE_MS = 480;

// What the greeting slot says when no card may greet: "full" is the genuinely
// empty dashboard (what this space is for, plus the way in), "wayIn" is the
// way in alone - cards exist, none of them may greet right now. "none" is a
// card (or nothing at all, before the first read).
type EmptySkyMode = "none" | "full" | "wayIn";

interface GreetingState {
  mode: EmptySkyMode;
  hero: DashboardGroup | undefined;
}

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
  // Holds the empty sky's fade-out while it hands the greeting slot over.
  let emptySkyHandOff: NodeJS.Timeout | undefined;

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

  // The card's quick pause - the ten-second door beside the questions. Captured
  // from the same clock read as the mode above, for the same reason: the line
  // and the wording must describe one moment, not two.
  const [getQuickPauseOffer, setQuickPauseOffer] = createSignal(
    getQuickPause(new Date(), "Morning"),
  );

  const [
    getIsDailyQuestionsBannerBeingRemoved,
    setIsDailyQuestionsBannerBeingRemoved,
  ] = createSignal<boolean>(false);

  // Arrival is calm: a single greeting (the centre pick - one of your own
  // reflections) instead of the full wall of cards, and nothing at all when
  // there is nothing of yours to reflect back. The rest stay tucked away until
  // you choose to "look back", which routes to the full grid (the /lookBack
  // page) rather than toggling an internal flag - so the grid is a real,
  // back-able view.
  const [getDashboardGroups, setDashboardGroups] = createSignal<
    DashboardGroup[]
  >([]);
  // The user's own questions, so an answer card can show its question text in
  // the hover title (custom qids aren't in the static pool the list looks in).
  const [getCustomQuestions, setCustomQuestions] = createSignal<
    CustomQuestion[]
  >([]);
  const navigate = useNavigate();

  // The greeting: the centre pick sits at CENTER_INDEX once there are enough
  // cards, and last when there are fewer. There is no filler card any more, so
  // that slot can legitimately hold something that must not greet (an
  // out-of-window recap, or just the tail of a list nothing was picked from) -
  // greet only when the card there is actually eligible, otherwise let the sky
  // stay empty.
  const heroOf = (groups: DashboardGroup[]): DashboardGroup | undefined => {
    const len = groups.length;
    const hero = groups[len > CENTER_INDEX ? CENTER_INDEX : len - 1];
    return hero && isGreetingEligible(hero, new Date()) ? hero : undefined;
  };

  // The greeting the user is actually looking at. Deliberately its *own* signal
  // rather than a memo over getDashboardGroups (the live data): the displayed
  // greeting is only ever set when the screen opens - holding whatever greeted
  // last, unless a re-greet freed it - or on a deliberate re-greet, which only
  // ever fires while the dashboard is hidden. A routine in-view refresh updates
  // the underlying data (and the "look back" count) but leaves this hero
  // untouched, so the greeting is never seen to change under the user (calm is
  // the product; a greeting only changes offscreen). Without this, a visible
  // REFRESH_DASHBOARD_EV that altered the group count, re-ran guardHeroSlot, or
  // diffed the hero's data would hand the keyed <Show> a fresh object,
  // remounting the card (a replayed entrance) right in front of the user.
  const [getHeroGroup, setHeroGroup] = createSignal<
    DashboardGroup | undefined
  >();

  // Which words, if any, are occupying the greeting slot. A controlled signal
  // for the same reason the hero above is one - and it starts at "none" so
  // nothing shows before the first read of the stored data comes back: an empty
  // group list means "not loaded yet" then, not "nothing to show", and deriving
  // this live would flash the words for a frame on every arrival.
  const [getEmptySkyMode, setEmptySkyMode] = createSignal<EmptySkyMode>("none");

  // Set while those words are fading out to make room for whatever takes the
  // slot next (see showGreeting). They are a surface like any other: they must
  // never be pulled out from under the user mid-transition.
  const [getIsEmptySkyBeingRemoved, setIsEmptySkyBeingRemoved] =
    createSignal(false);

  // The state waiting to land at the end of that fade, if any. A signal, not a
  // plain variable, because the "look back" count below has to know that a card
  // is already on its way into the slot.
  const [getPendingGreeting, setPendingGreeting] = createSignal<
    GreetingState | undefined
  >();

  // "sun" or "moon", following the disc resting in the bottom bar rather than a
  // clock read taken once when these words mounted.
  const getCompanionWord = createCompanionWord();

  // Every card the collapsed view is holding back: all of them bar the one in
  // the greeting slot. A card already on its way into that slot counts as being
  // in it - during a hand-off the card is in the list a fade before it is on
  // screen, and without this "look back" would flash in and straight back out.
  // The words themselves hold no card, so when they stand in for a greeting
  // ("wayIn": cards exist, none may greet) every card is genuinely held back.
  const getHeldBackCount = () =>
    getDashboardGroups().length -
    (getHeroGroup() || getPendingGreeting()?.hero ? 1 : 0);

  // Remember the tile we actually greeted with, so a return can hold it and a
  // re-greet can steer away from it. Tracking the rendered hero (rather than the
  // raw pick) keeps the memory honest when a refresh preserves the existing
  // greeting.
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
        const now = new Date();
        const mode = getDailyQuestionsMode();
        setDailyQuestionsBannerMode(mode);
        // Deterministic per local day and mode, so re-running refresh() while
        // the card is on screen re-derives the same line rather than swapping
        // the invitation out from under whoever is reading it.
        setQuickPauseOffer(getQuickPause(now, mode));
        scheduleDailyQuestionsBannerExpiry();
      } else {
        window.clearTimeout(bannerExpiry);
      }
      setIsShowDailyQuestionsBanner(showDailyQuestionsBanner);
      setCustomQuestions(syncData.customQuestions ?? []);

      // Whether this landing decides the greeting at all - held or freshly
      // rolled - and which way the rebuilt list should be steered.
      const { isChoosingGreeting, steer } = decideGreeting({
        isGridView: !!props.forceRevealed,
        isReGreet: reselect,
        isGreetingOnScreen: getHeroGroup() !== undefined,
        lastGreetingKey: getLastGreetingKey(),
        takeReGreetRequest,
      });

      const existingDashboardGroups = getDashboardGroups();
      let groups: DashboardGroup[];
      if (!reselect && existingDashboardGroups.length) {
        groups = updateDashboardEntriesFromQuestions(
          syncData,
          existingDashboardGroups,
          undefined,
          steer,
        );
      } else {
        groups = getDashboardEntriesFromQuestions(syncData, undefined, steer);
      }
      setDashboardGroups(groups);

      // The greeting slot takes whatever the build put in it - the held tile,
      // or a fresh pick - and only when this landing decides the greeting at
      // all: the screen opening, or a deliberate re-greet. A routine in-view
      // refresh leaves the displayed hero exactly as it is, so the greeting is
      // never seen to change under the user.
      //
      // "No greeting yet" is no longer only the first refresh: with nothing of
      // the user's to reflect back there is no greeting at all, so that branch
      // stays reachable for as long as the dashboard is empty - and an in-view
      // refresh *does* reach it (Android/iOS dispatch one on resume). That is
      // the right moment to bring the first card in; it just has to arrive
      // softly, which is what showGreeting handles.
      //
      // The grid has no greeting of its own, but it shows the same words when
      // it holds no cards - so it settles the slot with no hero, rather than
      // sitting this out and leaving those words unset. Passing no hero is also
      // what keeps it from recording a greeting it never showed: the memory
      // would otherwise remember the grid's centre card, and the dashboard
      // would come back greeting with a tile the user was never greeted with.
      if (props.forceRevealed) {
        showGreeting(undefined, groups);
      } else if (isChoosingGreeting) {
        showGreeting(heroOf(groups), groups);
      }
    });
  };

  // What the greeting slot should hold, given what there is to show. One place
  // decides it, so the three states can't drift: a card, the words, or nothing.
  const greetingStateFor = (
    hero: DashboardGroup | undefined,
    groups: DashboardGroup[],
  ): GreetingState =>
    hero
      ? { mode: "none", hero }
      : // Nothing may greet. Either there is genuinely nothing of the user's
        // yet (say what this space is, and where the way in is), or cards exist
        // but none of them may greet *right now* - an evening whose only entries
        // are morning recaps. That second state used to be filled by the quote;
        // without it the sky would hold nothing but a lone "look back" link, so
        // keep the way in - just not the line about an empty room.
        { mode: groups.length ? "wayIn" : "full", hero: undefined };

  // Move the greeting slot to its new state, softly. Words the user can
  // actually see always fade before they give the slot up or change what they
  // say; everything else settles at once (arriving words play their own
  // entrance, and words hidden behind the daily-questions banner have nothing
  // to fade). Unmounting them the instant the hero is set would cut them dead
  // while the card played its own 900ms entrance next to the hole they left.
  const showGreeting = (
    hero: DashboardGroup | undefined,
    groups: DashboardGroup[],
  ) => {
    const next = greetingStateFor(hero, groups);
    const areWordsVisible =
      getEmptySkyMode() !== "none" && !getIsShowDailyQuestionsBanner();

    if (!areWordsVisible || next.mode === getEmptySkyMode()) {
      cancelHandOff();
      settleGreeting(next);
      return;
    }

    // A fade toward this same state is already running: update what lands at
    // the end of it rather than restarting the clock. Refreshes arriving faster
    // than the fade would otherwise hold the slot empty indefinitely.
    if (getPendingGreeting()?.mode === next.mode) {
      setPendingGreeting(next);
      return;
    }

    cancelHandOff();
    setPendingGreeting(next);
    setIsEmptySkyBeingRemoved(true);
    emptySkyHandOff = setTimeout(() => {
      const landing = getPendingGreeting();
      setIsEmptySkyBeingRemoved(false);
      setPendingGreeting(undefined);
      if (landing) settleGreeting(landing);
    }, emptySkyFadeMs());
  };

  const settleGreeting = (state: GreetingState) => {
    setEmptySkyMode(state.mode);
    setHeroGroup(state.hero);
  };

  // Drop a hand-off that is still waiting behind a fade. Every decision
  // supersedes the one before it: without this, an older hand-off lands 480ms
  // late and installs a greeting built from data that has since changed - and
  // because a shown hero stops `refresh` from ever reconsidering, that phantom
  // card would sit there for good, with the real cards stranded behind a
  // "look back" link the restored hero has just hidden.
  const cancelHandOff = () => {
    window.clearTimeout(emptySkyHandOff);
    setPendingGreeting(undefined);
    setIsEmptySkyBeingRemoved(false);
  };

  // Reduced motion asks for instant, not a slow fade: --dur-soft is 0ms there,
  // so waiting the full 480ms would leave the slot visibly empty in between.
  const emptySkyFadeMs = (): number =>
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
      ? 0
      : EMPTY_SKY_FADE_MS;

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
    window.clearTimeout(emptySkyHandOff);
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

  // The quick pause was taken. Outwardly identical to a dismissal - the card
  // fades and the day's invitation is spent - and deliberately so: nothing is
  // stored, nothing is counted, and the app never learns which door you took.
  // Kept as its own named path anyway, because "I did the thing" and "not now"
  // are different acts even when they leave the same trace (none).
  const completeQuickPause = () => {
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
      {/* The card leads with the quick pause rather than with "would you like
          some inspiration?", because the quick door is the one most days can
          actually afford - and a card that opens with a practice you can do
          where you stand needs no preamble asking permission first. The
          questions did not move; they are the second button. */}
      <div class={`txtSlightlyBigger ${styles.cardDailyQuestionsPrompt}`}>
        {getQuickPauseOffer().cue}
      </div>
      <div class={styles.cardDailyQuestionsDone}>
        <Btn onClick={() => completeQuickPause()}>
          {getQuickPauseOffer().done}
        </Btn>
      </div>
      <div class={styles.cardDailyQuestionsBtns}>
        {/* Both quiet: neither the longer path nor the exit should out-shout
            the practice the card just offered. */}
        <Btn soft onClick={() => navigate("/dailyQuestions")}>
          a few questions
        </Btn>
        <Btn soft onClick={() => removeDailyQuestionsBanner()}>
          not now
        </Btn>
      </div>
    </div>
  );

  // There is nothing of the user's to reflect back yet (a fresh profile, before
  // the first answer). The dashboard used to fill that moment with a borrowed
  // quote; instead, say plainly what this space is and where the way in is. Two
  // quiet lines, in the app's own voice, on the bare sky - no card chrome, so
  // this reads as the room speaking rather than another surface to act on. It
  // disappears for good the moment there is anything of yours to show.
  const renderEmptySky = () => (
    <div
      classList={{
        [styles.emptySky]: true,
        [styles.isBeingRemoved]: getIsEmptySkyBeingRemoved(),
      }}
    >
      {/* Only when the dashboard is genuinely empty - saying it to someone who
          has entries, just none that may greet right now, would be untrue.
          Present tense, like every other line the app speaks: it describes the
          room as it is rather than predicting what the user will do in it. */}
      <Show when={getEmptySkyMode() === "full"}>
        <div class={`txtSlightlyBigger ${styles.emptySkyLine}`}>
          This is where your reflections gather.
        </div>
      </Show>
      <div class={`txtSmaller ${styles.emptySkyLine} ${styles.emptySkyWayIn}`}>
        {/* The disc below is the moon after dark, so name it the way the rest
            of the app's copy does - and reactively (createCompanionWord), since
            these words can sit mounted across the day/night threshold that
            flips the disc. The apostrophe is typographic, not a straight tick:
            this line is set in Newsreader, where a typewriter quote reads as a
            blemish. */}
        Tap the {getCompanionWord()} below whenever you’d like a pause.
      </div>
    </div>
  );

  const renderCard = (dg: DashboardGroup, isSingleCard = false) => {
    const isSkyGreeting = isSingleCard && PASSIVE_HERO_TYPES.has(dg.type);
    // Energy/emotion can stay visually quiet on the sky, but when either is the
    // only dashboard group there is no "look back" route beneath it. Keep that
    // sole route clickable and keyboard-accessible; with multiple groups,
    // look-back remains the one calm navigation affordance.
    const isInteractive = createDashboardCardInteractivity({
      isSingleCard,
      isSkyGreeting,
      getGroupCount: () => getDashboardGroups().length,
    });
    const activate = () => {
      if (isInteractive()) props.onQuestionCategorySelect?.(dg.id);
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
              return (
                <DashboardAnswerList
                  dashboardGroup={dg}
                  customQuestions={getCustomQuestions()}
                />
              );
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
              <Show
                when={getHeroGroup()}
                keyed
                fallback={
                  // No card may greet - see greetingStateFor for which words
                  // that means. Stays silent until the first read has come back
                  // (the mode starts at "none").
                  <Show when={getEmptySkyMode() !== "none"}>
                    {renderEmptySky()}
                  </Show>
                }
              >
                {(g) => renderCard(g, true)}
              </Show>
            }
          >
            {renderDailyQuestionsBanner()}
          </Show>

          {/* Offer "look back" whenever the collapsed view is holding something
              back - including the case where nothing greets you but cards exist
              (only out-of-window recaps), which would otherwise strand them. */}
          <Show when={getHeldBackCount() > 0}>
            <Btn plain class={styles.revealBtn} onClick={revealAll}>
              look back
            </Btn>
          </Show>
        </div>
      }
    >
      {/* "look back" only routes here with cards to show, but the page is a
          real, linkable route: opened directly, or still open when the last
          card ages out, it would otherwise be a blank scroll area. The same
          words the collapsed view uses say what the empty grid is. */}
      <Show
        when={getDashboardGroups().length || getEmptySkyMode() === "none"}
        fallback={<div class={styles.collapsed}>{renderEmptySky()}</div>}
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
    </Show>
  );
};
