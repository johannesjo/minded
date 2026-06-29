import {
  HashRouter,
  Route,
  RouteSectionProps,
  useLocation,
  useSearchParams,
} from "@solidjs/router";
import { Dashboard } from "@src/shared/components/dashboard/Dashboard";
import {
  createEffect,
  createSignal,
  JSX,
  onCleanup,
  onMount,
  Show,
} from "solid-js";
import {
  addWrapperClasses,
  isDarkModeNow,
} from "@src/shared/addWrapperClasses";
import Sun from "@src/shared/components/interaction/sun/Sun";
import {
  computeCompanionBottomYPx,
  getIsShellSunHidden,
  getIsSunHandoffInFlight,
  getSunHandlers,
  getSunOrbit,
  getSunRole,
  getSunSettleForCurrentRole,
  isShellSunInteractive,
  setBreathStartedAt,
  setCompanionBottomYPx,
  setSunRole,
} from "@src/shared/components/interaction/sun/sunStore";
import { QuestionCategoryView } from "@src/shared/components/questionCategoryView/QuestionCategoryView";

import {
  IS_ANDROID,
  IS_IOS,
  IS_WEB_EXT,
} from "@src/dataInterface/commonSyncDataInterface";

import Feedback from "@src/shared/components/feedback/Feedback";
import BottomBar from "@src/shared/components/bottomBar/BottomBar";
import InteractionOverlay from "@src/shared/components/dashboard/interactionOverlay/InteractionOverlay";
import { REFRESH_DASHBOARD_EV } from "@src/ev.const";
import { SettingsAndroidRoute } from "@src/android/components/settingsAndroid/SettingsAndroidRoute";
import { SettingsWebRoute } from "@src/pages/newtab/components/settingsWebRoute/SettingsWebRoute";
// @ts-ignore
import styles from "./RouteCmp.module.scss";
import DailyQuestions from "@src/shared/components/dailyQuestions/DailyQuestions";
import InteractionIOS from "@src/ios/interaction/InteractionIOS";
import SleepWindDownRoute from "@src/shared/components/sleepWindDown/SleepWindDownRoute";
import Styleguide from "@src/shared/components/styleguide/Styleguide";

// Vite replaces process.env.NODE_ENV at build time. `npm start` sets NODE_ENV=development,
// so the styleguide route registers (and the import is kept). `npm run build` defaults to
// production, so this evaluates to false and Rollup tree-shakes the import out.
const IS_DEV: boolean = process.env.NODE_ENV !== "production";

const MainWrapper = (props: RouteSectionProps) => {
  // A widget cold-start arrives with `?sun=open` already in the hash. Read it
  // synchronously here so the interaction overlay is part of the FIRST render —
  // otherwise the dashboard paints for a frame before a post-mount effect could
  // open it. (Warm re-taps are handled by the effect below.)
  const [searchParams, setSearchParams] = useSearchParams();
  const openedFromWidgetAtLaunch = searchParams.sun === "open";

  const [getIsShowQuestionOverlay, setIsShowQuestionOverlay] =
    createSignal<boolean>(openedFromWidgetAtLaunch);
  // Open with no entrance fade when it came from the widget, so we land straight
  // in the interaction instead of fading the dashboard out behind it. A normal
  // companion tap keeps the gentle fade.
  const [getIsOverlayInstant, setIsOverlayInstant] = createSignal<boolean>(
    openedFromWidgetAtLaunch,
  );
  // Pointer hover over the resting companion (relayed from its tap target, since
  // the disc itself is pointer-transparent) — lifts + glows the sun.
  const [getIsCompanionHovered, setIsCompanionHovered] =
    createSignal<boolean>(false);

  const location = useLocation();
  const isDashboard = () => location.pathname === "/";
  // Day/night for the sun. Seed from the time-based rule for the first paint,
  // then (in onMount, after addWrapperClasses applies it) mirror the actual
  // `.minded-6622-dark` class so the companion can't disagree with the rendered
  // theme. On web-ext the class is set once on mount and never flips, so no
  // observer is needed. (Shortcut: on Android a background→resume across the
  // dark-mode threshold can flip the class; this one-shot read won't catch
  // that — rare; add a resume listener here if it ever bites.)
  const [getSunVariant, setSunVariant] = createSignal<"sun" | "moon">(
    isDarkModeNow() ? "moon" : "sun",
  );

  // The disc is interactive only while the role is "interactive" AND no hand-off
  // to the post-sun choices is in flight — otherwise the centred, full-size disc
  // (z-30, above the overlay) would grab taps meant for the choices that mount
  // before the deferred role flip (see getIsSunHandoffInFlight).
  const isSunInteractive = () =>
    isShellSunInteractive(getSunRole(), getIsSunHandoffInFlight());

  // const navigate = useNavigate();

  // The home-screen sun widget (Android now, iOS later) launches the app with
  // `?sun=open` to mirror tapping the in-app companion: it opens the very same
  // interaction overlay, and the existing flow handles the exit identically. A
  // warm re-tap (native sets the hash on the already-live page) is handled here;
  // a cold start is handled synchronously above so the overlay is in the first
  // render. The flag is cleared once consumed so a resume can't reopen it.
  createEffect(() => {
    if (searchParams.sun !== "open") return;
    // Only while the sun is resting as the companion — never cut into an
    // interaction that's already in flight.
    if (getSunRole() === "companion" && !getIsShowQuestionOverlay()) {
      setIsOverlayInstant(true);
      setIsShowQuestionOverlay(true);
    }
    setSearchParams({ sun: undefined }, { replace: true });
  });

  onMount(() => {
    addWrapperClasses();
    // addWrapperClasses just set (or cleared) the dark class — read the real
    // value so the sun matches the wrapper exactly.
    const wrapperEl = document.getElementById("minded-6622");
    if (wrapperEl) {
      setSunVariant(
        wrapperEl.classList.contains("minded-6622-dark") ? "moon" : "sun",
      );
    }

    // The companion anchor is already exact from the store's computed initial
    // value, so the sun rests in place from first paint; just keep it in sync
    // with the viewport on resize.
    const onResize = () => setCompanionBottomYPx(computeCompanionBottomYPx());
    window.addEventListener("resize", onResize);
    onCleanup(() => window.removeEventListener("resize", onResize));
    // getSyncData().then((syncData: SyncData) => {
    //   if (
    //     !syncData || IS_ANDROID
    //       ? !syncData.cfg.blockedApps.length
    //       : !syncData.cfg.blockedHosts.length
    //   ) {
    //     navigate("/settings");
    //   }
    // });
  });

  return (
    <>
      <main
        class={styles.contentWrapper}
        classList={{ [styles.withCompanionBar]: !isDashboard() }}
      >
        {props.children}
      </main>

      {/*
        One persistent sun for the whole shell: it rests as the companion over
        the bottom bar and (Phase 2) transforms into the interactive intervention
        — never swapped for a second element. The layer is fixed + viewport-centred
        so the sun's base is screen-centre (interactive rest); the companion
        settle offsets it down to the bottom bar. Click-through except the disc /
        the companion tap-target.
        Phase 1: still hidden while the overlay shows its own sun.
      */}
      <div
        class={styles.shellSunLayer}
        classList={{
          [styles.isInteractive]: isSunInteractive(),
          // A live intervention pins the idle float still so the disc's centre
          // stays exactly on the point the background glow tracks (see the SCSS
          // note). The daily-questions phases have no such glow to track, so they
          // keep their gentle idle float.
          [styles.isIntervention]:
            getSunRole() !== "companion" &&
            getSunRole() !== "dailyQuestions" &&
            getSunRole() !== "dailyQuestionsSuccess",
          // The companion rest must sit perfectly still on the bottom-bar anchor.
          // The idle float is upward-only (0 → -4px), so it would ride the disc up
          // to 4px above the settings / feedback icons' centre line for most of
          // its cycle, reading as "sitting too high / not vertically centred". A
          // still companion also matches the no-ambient-breath rule for the soft
          // sun (it morphs into place, then rests; it doesn't inhale).
          [styles.isCompanion]: getSunRole() === "companion",
          // A dashboard offer that owns the screen has taken over (the flung-up
          // let-go question, or grounding's screen-free / Android-lock sit); hide
          // the disc behind it instead of letting it paint over the screen. It
          // returns home when the offer closes.
          [styles.isHidden]: getIsShellSunHidden(),
        }}
      >
        <div class={styles.shellSunSlot}>
          <Sun
            variant={getSunVariant()}
            settle={getSunSettleForCurrentRole()}
            orbit={getSunOrbit()}
            onBreathStart={setBreathStartedAt}
            minimizeWillChange={true}
            isDragEnabled={isSunInteractive()}
            isTapEnabled={
              isSunInteractive() && (getSunHandlers()?.isTapEnabled ?? true)
            }
            isHovered={getSunRole() === "companion" && getIsCompanionHovered()}
            tapThreshold={getSunHandlers()?.tapThreshold ?? 3}
            onSkip={() => getSunHandlers()?.onSkip()}
            onFlingAway={() => getSunHandlers()?.onFlingAway()}
            onDragComplete={() => getSunHandlers()?.onDragComplete()}
            onStartBackgroundAnimation={(d) =>
              getSunHandlers()?.onStartBackgroundAnimation?.(d)
            }
            onCompletionStarted={(s) =>
              getSunHandlers()?.onCompletionStarted?.(s)
            }
          />
        </div>
        <Show
          when={getSunRole() === "companion" && !getIsShowQuestionOverlay()}
        >
          <button
            type="button"
            class={styles.companionTapTarget}
            aria-label="Get asked a question"
            onMouseEnter={() => setIsCompanionHovered(true)}
            onMouseLeave={() => setIsCompanionHovered(false)}
            onClick={() => {
              // Open the overlay; the interaction measures its sun placeholder
              // and *then* flips the role, so the disc rises from the bottom bar
              // straight onto its slot in one slow glide (no base detour).
              setIsCompanionHovered(false);
              setIsOverlayInstant(false); // in-app tap keeps the gentle fade
              setIsShowQuestionOverlay(true);
            }}
          />
        </Show>
      </div>

      <BottomBar />

      {getIsShowQuestionOverlay() && (
        <InteractionOverlay
          instant={getIsOverlayInstant()}
          onPossibleNewData={() => {
            window.dispatchEvent(new Event(REFRESH_DASHBOARD_EV));
          }}
          onHideInteraction={() => {
            // The overlay (sky + choices) is gone; send the same disc gliding
            // back to its companion rest in the top bar.
            setSunRole("companion");
            // Drop any breath origin so the next pause starts from a fresh clock.
            setBreathStartedAt(undefined);
            setIsShowQuestionOverlay(false);
            setIsOverlayInstant(false);
            // The greeting was already re-rolled when the overlay *started*
            // fading (RE_GREET_DASHBOARD_HIDDEN_EV, dispatched from the overlay),
            // so the fresh tile is in place behind it — nothing to swap here, or
            // you'd see it change a second time after the sky is gone.
          }}
        />
      )}
    </>
  );
};

const RoutesCmp = (props: { children?: JSX.Element }) => {
  return (
    <div id="minded-6622-coloured-wrapper" class={styles.mainWrapper}>
      {props.children}
      {/*<div*/}
      {/*  class="missingCapabilitiesMsg"*/}
      {/*  style="border: 2px solid red; min-height: 100px"*/}
      {/*>*/}
      {/*  <em>minded</em> is missing permissions to work properly. Click here to*/}
      {/*  resolve!*/}
      {/*</div>*/}

      <HashRouter root={MainWrapper}>
        <Route path="*" component={() => <Dashboard />} />
        {/*
          The "show all" / look-back view: the full grid of every tile, as its
          own route so it behaves exactly like settings — the global bottom bar
          shows its back arrow (and Android's hardware back returns here) instead
          of stranding the user in the expanded grid with no way back.
        */}
        <Route path="/lookBack" component={() => <Dashboard forceRevealed />} />
        <Route
          path="/questionCategory/:questionCategoryId"
          component={QuestionCategoryView}
        />
        {IS_ANDROID && (
          <Route path="/settings" component={SettingsAndroidRoute} />
        )}
        {IS_IOS && <Route path="/interaction" component={InteractionIOS} />}
        {IS_WEB_EXT && <Route path="/settings" component={SettingsWebRoute} />}
        <Route path="/feedback" component={Feedback} />
        <Route path="/dailyQuestions" component={DailyQuestions} />
        {IS_ANDROID && (
          <Route path="/sleepWindDown" component={SleepWindDownRoute} />
        )}
        {IS_DEV && <Route path="/styleguide" component={Styleguide} />}
      </HashRouter>
    </div>
  );
};

export default RoutesCmp;
