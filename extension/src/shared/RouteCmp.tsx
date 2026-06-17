import {
  HashRouter,
  Route,
  RouteSectionProps,
  useLocation,
} from "@solidjs/router";
import { Dashboard } from "@src/shared/components/dashboard/Dashboard";
import { createSignal, JSX, onCleanup, onMount, Show } from "solid-js";
import {
  addWrapperClasses,
  isDarkModeNow,
} from "@src/shared/addWrapperClasses";
import Sun from "@src/shared/components/interaction/sun/Sun";
import {
  getSunHandlers,
  getSunRole,
  getSunSettleForCurrentRole,
  setCompanionTopYPx,
  setSunPosition,
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
  const [getIsShowQuestionOverlay, setIsShowQuestionOverlay] =
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

  // const navigate = useNavigate();

  // Resolve `--companion-top-bar-center-y` to px so the shell sun can rest
  // exactly on the top-bar anchor. The var is a calc()/clamp(), which
  // getComputedStyle won't resolve, so measure it with a hidden probe under the
  // element that defines it.
  const measureCompanionAnchor = () => {
    const host = document.getElementById("minded-6622-coloured-wrapper");
    if (!host) return;
    const probe = document.createElement("div");
    probe.style.cssText =
      "position:absolute;visibility:hidden;pointer-events:none;height:var(--companion-top-bar-center-y);";
    host.appendChild(probe);
    setCompanionTopYPx(probe.getBoundingClientRect().height);
    probe.remove();
  };

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

    measureCompanionAnchor();
    const onResize = () => measureCompanionAnchor();
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
        One persistent sun for the whole shell: it rests as the companion in the
        top bar and (Phase 2) transforms into the interactive intervention —
        never swapped for a second element. The layer is fixed + viewport-centred
        so the sun's base is screen-centre (interactive rest); the companion
        settle offsets it up to the top bar. Click-through except the disc / the
        companion tap-target.
        Phase 1: still hidden while the overlay shows its own sun.
      */}
      <div
        class={styles.shellSunLayer}
        classList={{
          [styles.isInteractive]: getSunRole() === "interactive",
        }}
      >
        <div class={styles.shellSunSlot}>
          <Sun
            variant={getSunVariant()}
            settle={getSunSettleForCurrentRole()}
            onPositionChange={setSunPosition}
            isDragEnabled={getSunRole() === "interactive"}
            isTapEnabled={getSunRole() === "interactive"}
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
        <Show when={getSunRole() === "companion"}>
          <button
            type="button"
            class={styles.companionTapTarget}
            aria-label="Get asked a question"
            onClick={() => {
              // Hand the same disc into the intervention: it glides from the
              // top bar to centre (role → interactive) as the overlay opens.
              setSunRole("interactive");
              setIsShowQuestionOverlay(true);
            }}
          />
        </Show>
      </div>

      <BottomBar />

      {getIsShowQuestionOverlay() && (
        <InteractionOverlay
          onPossibleNewData={() => {
            window.dispatchEvent(new Event(REFRESH_DASHBOARD_EV));
          }}
          onHideInteraction={() => {
            // The overlay (sky + choices) is gone; send the same disc gliding
            // back to its companion rest in the top bar.
            setSunRole("companion");
            setIsShowQuestionOverlay(false);
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
        <Route path="*" component={Dashboard} />
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
