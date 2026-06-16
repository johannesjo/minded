import {
  HashRouter,
  Route,
  RouteSectionProps,
  useLocation,
} from "@solidjs/router";
import { Dashboard } from "@src/shared/components/dashboard/Dashboard";
import { createSignal, JSX, onMount } from "solid-js";
import {
  addWrapperClasses,
  isDarkModeNow,
} from "@src/shared/addWrapperClasses";
import {
  CompanionSun,
  CompanionHome,
} from "@src/shared/components/companionSun/CompanionSun";
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

// The persistent companion sun's resting "homes". It glides between them as the
// route changes (see CompanionSun). The dashboard hero sits near the top; other
// pages reserve a transparent top bar for the smaller shell companion.
const DASHBOARD_SUN_HOME: CompanionHome = {
  centerX: "50vw",
  centerY: "11vh",
  scale: 0.86,
};
const TOP_BAR_SUN_HOME: CompanionHome = {
  centerX: "50vw",
  centerY: "var(--companion-top-bar-center-y)",
  scale: 0.66,
};
const QUESTION_OVERLAY_SUN_HOME: CompanionHome = {
  centerX: "50vw",
  centerY: "19vh",
  scale: 0.72,
};

const MainWrapper = (props: RouteSectionProps) => {
  const [getIsShowQuestionOverlay, setIsShowQuestionOverlay] =
    createSignal<boolean>(false);

  const location = useLocation();
  const isDashboard = () => location.pathname === "/";
  // Day/night for the sun. Seed from the time-based rule for the first paint,
  // then (in onMount, after addWrapperClasses applies it) mirror the actual
  // `.minded-6622-dark` class so the companion can't disagree with the rendered
  // theme. The class is set once on mount and never flips mid-session, so no
  // observer is needed.
  const [getSunVariant, setSunVariant] = createSignal<"sun" | "moon">(
    isDarkModeNow() ? "moon" : "sun",
  );
  // Reactive via location; cheap enough to be a plain accessor (no memo needed).
  const companionHome = (): CompanionHome =>
    getIsShowQuestionOverlay()
      ? QUESTION_OVERLAY_SUN_HOME
      : isDashboard()
        ? DASHBOARD_SUN_HOME
        : TOP_BAR_SUN_HOME;
  const isCompanionInteractive = () => !getIsShowQuestionOverlay();

  // const navigate = useNavigate();

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

      <CompanionSun
        home={companionHome()}
        visible={true}
        interactive={isCompanionInteractive()}
        variant={getSunVariant()}
        onTap={() => setIsShowQuestionOverlay(true)}
      />

      <BottomBar />

      {getIsShowQuestionOverlay() && (
        <InteractionOverlay
          onPossibleNewData={() => {
            window.dispatchEvent(new Event(REFRESH_DASHBOARD_EV));
          }}
          onHideInteraction={() => {
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
